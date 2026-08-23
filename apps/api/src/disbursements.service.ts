import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { disbursementSchema } from '@reliefchain/contracts';
import type { SessionUser } from './auth';
import { DatabaseService } from './database.service';
import type { LedgerPort } from './ports';
import { LEDGER_PORT } from './ports';

function publicRef() { return `RC-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`; }

@Injectable()
export class DisbursementsService {
  constructor(private db: DatabaseService, @Inject(LEDGER_PORT) private ledger: LedgerPort) {}

  async initiate(raw: any, user: SessionUser) {
    const input = disbursementSchema.parse(raw), id = raw.id ?? randomUUID(), reference = publicRef();
    return this.db.transaction(async (client) => {
      const existing = await client.query<any>('SELECT * FROM disbursements WHERE idempotency_key=$1', [input.idempotencyKey]);
      if (existing.rowCount) return existing.rows[0];
      const allocation = (await client.query<any>('SELECT * FROM allocations WHERE id=$1 FOR UPDATE', [input.allocationId])).rows[0];
      const beneficiary = (await client.query<any>('SELECT * FROM beneficiaries WHERE id=$1', [input.beneficiaryId])).rows[0];
      if (!allocation || !beneficiary) throw new NotFoundException('Allocation or beneficiary not found');
      if (allocation.owner_msp !== user.orgMsp) throw new ForbiddenException('Allocation belongs to another organization');
      if (allocation.district_code !== beneficiary.district_code || allocation.scheme_id !== beneficiary.scheme_id) throw new BadRequestException('Beneficiary is not eligible for this allocation');
      if (Number(allocation.reserved_paise) + Number(allocation.disbursed_paise) + input.amountPaise > Number(allocation.amount_paise)) throw new BadRequestException('Disbursement exceeds allocation balance');
      const proof = await this.ledger.submit('InitiateDisbursement', [id, reference, input.allocationId, beneficiary.beneficiary_ref, String(input.amountPaise), input.idempotencyKey],
        { name: 'DisbursementInitiated', entityType: 'disbursement', entityId: id, payload: { publicReference: reference, allocationId: input.allocationId, amountPaise: input.amountPaise, status: 'PENDING', ownerMsp: user.orgMsp } });
      await client.query('UPDATE allocations SET reserved_paise=reserved_paise+$1 WHERE id=$2', [input.amountPaise, input.allocationId]);
      await client.query(`INSERT INTO disbursements(id,public_reference,allocation_id,beneficiary_id,beneficiary_ref,amount_paise,status,idempotency_key,simulated_outcome,proof)
        VALUES($1,$2,$3,$4,$5,$6,'PENDING',$7,$8,$9)`, [id, reference, input.allocationId, input.beneficiaryId, beneficiary.beneficiary_ref, input.amountPaise, input.idempotencyKey, input.simulatedOutcome, proof]);
      await client.query(`INSERT INTO payout_jobs(disbursement_id,outcome,run_after) VALUES($1,$2,now()+($3 || ' milliseconds')::interval)`,
        [id, input.simulatedOutcome, Number(process.env.MOCK_PAYOUT_DELAY_MS ?? 1500)]);
      return { id, publicReference: reference, amountPaise: input.amountPaise, status: 'PENDING', proof };
    });
  }

  async reverse(id: string, reason: string, user: SessionUser) {
    return this.db.transaction(async (client) => {
      const payout = (await client.query<any>('SELECT d.*,a.owner_msp FROM disbursements d JOIN allocations a ON a.id=d.allocation_id WHERE d.id=$1 FOR UPDATE', [id])).rows[0];
      if (!payout) throw new NotFoundException(); if (payout.owner_msp !== user.orgMsp) throw new ForbiddenException();
      if (payout.status !== 'SETTLED') throw new BadRequestException('Only settled payouts can be reversed');
      const proof = await this.ledger.submit('ReverseDisbursement', [id, reason], { name: 'DisbursementReversed', entityType: 'disbursement', entityId: id, payload: { publicReference: payout.public_reference, amountPaise: Number(payout.amount_paise), status: 'REVERSED', reason, ownerMsp: payout.owner_msp } });
      await client.query('UPDATE allocations SET disbursed_paise=disbursed_paise-$1 WHERE id=$2', [payout.amount_paise, payout.allocation_id]);
      await client.query("UPDATE disbursements SET status='REVERSED',failure_reason=$1,proof=$2,updated_at=now() WHERE id=$3", [reason, proof, id]);
      return { id, status: 'REVERSED', proof };
    });
  }
}