import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { disbursementSchema } from '@reliefchain/contracts';
import type { SessionUser } from './auth';
import { DatabaseService } from './database.service';
import type { LedgerPort } from './ports';
import { LEDGER_PORT } from './ports';
import { requireOrganization } from './authorization';

function publicRef() { return `RC-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`; }

@Injectable()
export class DisbursementsService {
  constructor(private db: DatabaseService, @Inject(LEDGER_PORT) private ledger: LedgerPort) {}

  private async publicReference() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const reference = publicRef();
      if (!(await this.db.query('SELECT 1 FROM disbursements WHERE public_reference=$1', [reference])).rowCount) return reference;
    }
    throw new ConflictException('Could not allocate a unique public reference');
  }

  async initiate(raw: any, user: SessionUser) {
    const input = disbursementSchema.parse(raw), id = raw.id ?? randomUUID(), requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const reservation = await this.db.query<any>(`INSERT INTO disbursement_requests(idempotency_key,request_hash,status)
      VALUES($1,$2,'PROCESSING')
      ON CONFLICT(idempotency_key) DO UPDATE SET status='PROCESSING',updated_at=now()
      WHERE disbursement_requests.status='FAILED' AND disbursement_requests.request_hash=EXCLUDED.request_hash
      RETURNING idempotency_key`, [input.idempotencyKey, requestHash]);
    if (!reservation.rowCount) {
      const existing = await this.db.query<any>('SELECT status,response,request_hash FROM disbursement_requests WHERE idempotency_key=$1', [input.idempotencyKey]);
      if (existing.rows[0]?.request_hash !== requestHash) throw new ConflictException('Idempotency key was used with different request data');
      if (existing.rows[0]?.status === 'COMPLETED') return existing.rows[0].response;
      throw new ConflictException('A payout with this idempotency key is already processing');
    }
    try { const reference = await this.publicReference(); return await this.db.transaction(async (client) => {
      const allocation = (await client.query<any>('SELECT * FROM allocations WHERE id=$1 FOR UPDATE', [input.allocationId])).rows[0];
      const beneficiary = (await client.query<any>('SELECT * FROM beneficiaries WHERE id=$1', [input.beneficiaryId])).rows[0];
      if (!allocation || !beneficiary) throw new NotFoundException('Allocation or beneficiary not found');
      requireOrganization(user, allocation.owner_msp);
      if (allocation.district_code !== beneficiary.district_code || allocation.scheme_id !== beneficiary.scheme_id) throw new BadRequestException('Beneficiary is not eligible for this allocation');
      if (Number(allocation.reserved_paise) + Number(allocation.disbursed_paise) + input.amountPaise > Number(allocation.amount_paise)) throw new BadRequestException('Disbursement exceeds allocation balance');
      if (raw.batchId) {
        const batch = (await client.query<any>('SELECT * FROM payout_batches WHERE id=$1 AND owner_msp=$2', [raw.batchId, user.orgMsp])).rows[0];
        if (!batch || !['DRAFT', 'APPROVED', 'SUBMITTED'].includes(batch.status)) throw new BadRequestException('Invalid payout batch');
      }
      const proof = await this.ledger.submit('InitiateDisbursement', [id, reference, input.allocationId, beneficiary.beneficiary_ref, String(input.amountPaise), input.idempotencyKey],
        { name: 'DisbursementInitiated', entityType: 'disbursement', entityId: id, actorMsp: user.orgMsp as 'GovernmentMSP' | 'NgoMSP', payload: { publicReference: reference, allocationId: input.allocationId, amountPaise: input.amountPaise, ownerMsp: user.orgMsp, fromStatus: null, toStatus: 'PENDING' } });
      await client.query('UPDATE allocations SET reserved_paise=reserved_paise+$1 WHERE id=$2', [input.amountPaise, input.allocationId]);
      await client.query(`INSERT INTO disbursements(id,public_reference,allocation_id,beneficiary_id,beneficiary_ref,amount_paise,status,idempotency_key,simulated_outcome,batch_id,proof)
        VALUES($1,$2,$3,$4,$5,$6,'PENDING',$7,$8,$9,$10)`, [id, reference, input.allocationId, input.beneficiaryId, beneficiary.beneficiary_ref, input.amountPaise, input.idempotencyKey, input.simulatedOutcome, raw.batchId ?? null, proof]);
      await client.query(`INSERT INTO payout_jobs(disbursement_id,outcome,status,run_after) VALUES($1,$2,'QUEUED',now()+($3 || ' milliseconds')::interval)`,
        [id, input.simulatedOutcome, Number(process.env.MOCK_PAYOUT_DELAY_MS ?? 1500)]);
      const response = { id, publicReference: reference, amountPaise: input.amountPaise, status: 'PENDING', proof };
      await client.query('INSERT INTO disbursement_status_history(disbursement_id,to_status,metadata) VALUES($1,$2,$3)', [id, 'PENDING', JSON.stringify({ idempotencyKey: input.idempotencyKey })]);
      await client.query('INSERT INTO outbox_events(event_type,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,$4)', ['DisbursementInitiated', 'disbursement', id, JSON.stringify(response)]);
      await client.query('UPDATE disbursement_requests SET disbursement_id=$1,status=\'COMPLETED\',response=$2,updated_at=now() WHERE idempotency_key=$3', [id, JSON.stringify(response), input.idempotencyKey]);
      return response;
    }); } catch (error) {
      await this.db.query('UPDATE disbursement_requests SET status=\'FAILED\',updated_at=now() WHERE idempotency_key=$1', [input.idempotencyKey]);
      throw error;
    }
  }

  async createBatch(user: SessionUser) { const result = await this.db.query<any>('INSERT INTO payout_batches(owner_msp,status,created_by) VALUES($1,\'DRAFT\',$2) RETURNING *', [user.orgMsp, user.sub]); return result.rows[0]; }
  async approveBatch(id: string, user: SessionUser) {
    const result = await this.db.query<any>('UPDATE payout_batches SET status=\'APPROVED\',approved_by=$1,updated_at=now() WHERE id=$2 AND owner_msp=$3 AND status=\'PENDING_APPROVAL\' AND created_by<>$1 RETURNING *', [user.sub, id, user.orgMsp]);
    if (!result.rowCount) throw new BadRequestException('Batch is not awaiting approval or requires a different approver'); return result.rows[0];
  }
  async requestBatchApproval(id: string, user: SessionUser) {
    const result = await this.db.query<any>('UPDATE payout_batches SET status=\'PENDING_APPROVAL\',updated_at=now() WHERE id=$1 AND owner_msp=$2 AND status=\'DRAFT\' RETURNING *', [id, user.orgMsp]);
    if (!result.rowCount) throw new BadRequestException('Only draft batches can be submitted for approval'); return result.rows[0];
  }
  async submitBatch(id: string, user: SessionUser) {
    const result = await this.db.query<any>('UPDATE payout_batches SET status=\'SUBMITTED\',updated_at=now() WHERE id=$1 AND owner_msp=$2 AND status=\'APPROVED\' RETURNING *', [id, user.orgMsp]);
    if (!result.rowCount) throw new BadRequestException('Only approved batches can be submitted'); return result.rows[0];
  }

  async reverse(id: string, reason: string, user: SessionUser) {
    if (!reason?.trim()) throw new BadRequestException('A reversal reason is required');
    return this.db.transaction(async (client) => {
      const payout = (await client.query<any>('SELECT d.*,a.owner_msp FROM disbursements d JOIN allocations a ON a.id=d.allocation_id WHERE d.id=$1 FOR UPDATE', [id])).rows[0];
      if (!payout) throw new NotFoundException(); requireOrganization(user, payout.owner_msp);
      if (payout.status !== 'SETTLED') throw new BadRequestException('Only settled payouts can be reversed');
      const reasonCode = 'OPERATOR_REVERSAL';
      const proof = await this.ledger.submit('ReverseDisbursement', [id, reasonCode], { name: 'DisbursementReversed', entityType: 'disbursement', entityId: id, actorMsp: payout.owner_msp, payload: { publicReference: payout.public_reference, allocationId: payout.allocation_id, amountPaise: Number(payout.amount_paise), ownerMsp: payout.owner_msp, fromStatus: 'SETTLED', toStatus: 'REVERSED', reasonCode } });
      await client.query('UPDATE allocations SET disbursed_paise=disbursed_paise-$1 WHERE id=$2', [payout.amount_paise, payout.allocation_id]);
      await client.query("UPDATE disbursements SET status='REVERSED',failure_reason=$1,proof=$2,updated_at=now() WHERE id=$3", [reason, proof, id]);
      await client.query('INSERT INTO disbursement_status_history(disbursement_id,from_status,to_status,reason) VALUES($1,$2,$3,$4)', [id, 'SETTLED', 'REVERSED', reason]);
      await client.query('INSERT INTO outbox_events(event_type,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,$4)', ['DisbursementReversed', 'disbursement', id, JSON.stringify({ id, status: 'REVERSED', reason })]);
      return { id, status: 'REVERSED', proof };
    });
  }
}
