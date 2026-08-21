import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { beneficiaryReference, decryptPii, disbursementSchema, encryptPii } from '@reliefchain/contracts';
import type { SessionUser } from './auth';
import { DatabaseService } from './database.service';
import { LedgerService } from './ledger';

function publicRef() { return `RC-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`; }
function requireSecrets() {
  const encryptionKey = process.env.PII_ENCRYPTION_KEY, hmacSecret = process.env.BENEFICIARY_HMAC_SECRET;
  if (!encryptionKey || !hmacSecret) throw new Error('PII_ENCRYPTION_KEY and BENEFICIARY_HMAC_SECRET are required');
  return { encryptionKey, hmacSecret };
}

@Injectable()
export class ReliefService {
  constructor(private db: DatabaseService, private ledger: LedgerService) {}

  async createFundSource(input: any, user: SessionUser) {
    if (user.role === 'NGO' && input.sourceType !== 'NGO') throw new ForbiddenException('NGOs can only register NGO funds');
    const id = input.id ?? randomUUID();
    const proof = await this.ledger.submit('CreateFundSource', [id, input.disasterId, input.sourceType, input.name, String(input.amountPaise)],
      { name: 'FundSourceCreated', entityType: 'fundSource', entityId: id, payload: { ...input, id, ownerMsp: user.orgMsp } });
    await this.db.query(`INSERT INTO fund_sources(id,disaster_id,name,source_type,owner_msp,amount_paise,proof) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [id, input.disasterId, input.name, input.sourceType, user.orgMsp, input.amountPaise, proof]);
    return { id, ...input, proof };
  }

  async allocate(input: any, user: SessionUser) {
    const id = input.id ?? randomUUID();
    return this.db.transaction(async (client) => {
      const result = await client.query<any>('SELECT * FROM fund_sources WHERE id=$1 FOR UPDATE', [input.sourceId]); const source = result.rows[0];
      if (!source) throw new NotFoundException('Fund source not found');
      if (source.owner_msp !== user.orgMsp) throw new ForbiddenException('Fund source belongs to another organization');
      if (Number(source.allocated_paise) + input.amountPaise > Number(source.amount_paise)) throw new BadRequestException('Allocation exceeds available source balance');
      const proof = await this.ledger.submit('AllocateFunds', [id, input.sourceId, input.schemeId, input.districtCode, String(input.amountPaise)],
        { name: 'FundsAllocated', entityType: 'allocation', entityId: id, payload: { ...input, id, ownerMsp: user.orgMsp } });
      await client.query('UPDATE fund_sources SET allocated_paise=allocated_paise+$1 WHERE id=$2', [input.amountPaise, input.sourceId]);
      await client.query(`INSERT INTO allocations(id,source_id,scheme_id,district_code,owner_msp,amount_paise,proof) VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, input.sourceId, input.schemeId, input.districtCode, user.orgMsp, input.amountPaise, proof]);
      return { id, ...input, proof };
    });
  }

  async registerBeneficiary(input: any, user: SessionUser) {
    const id = input.id ?? randomUUID(), { encryptionKey, hmacSecret } = requireSecrets();
    if (user.districtCode && user.districtCode !== input.districtCode) throw new ForbiddenException('Operator is restricted to another district');
    const beneficiaryRef = beneficiaryReference(input.aadhaar, hmacSecret), phone = input.phone.replace(/\s/g, '');
    const proof = await this.ledger.submit('RegisterBeneficiaryCommitment', [beneficiaryRef, input.districtCode, input.schemeId],
      { name: 'BeneficiaryCommitted', entityType: 'beneficiaryCommitment', entityId: beneficiaryRef, payload: { districtCode: input.districtCode, schemeId: input.schemeId, ownerMsp: user.orgMsp } });
    await this.db.query(`INSERT INTO beneficiaries(id,beneficiary_ref,name_enc,phone_enc,phone_hash,district_code,scheme_id,promised_paise,proof)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, beneficiaryRef, encryptPii(input.name, encryptionKey), encryptPii(phone, encryptionKey),
      createHash('sha256').update(phone).digest('hex'), input.districtCode, input.schemeId, input.promisedPaise ?? 0, proof]);
    return { id, beneficiaryRef, districtCode: input.districtCode, schemeId: input.schemeId, proof };
  }

  async initiateDisbursement(raw: any, user: SessionUser) {
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

  async finalizeJob(job: any) {
    const payoutResult = await this.db.query<any>('SELECT d.*,a.owner_msp FROM disbursements d JOIN allocations a ON a.id=d.allocation_id WHERE d.id=$1', [job.disbursement_id]);
    const payout = payoutResult.rows[0]; if (!payout || payout.status !== 'PENDING') return;
    const bankReference = `SIMBANK-${randomUUID().slice(0, 12).toUpperCase()}`, failureReason = job.outcome === 'FAILED' ? 'Simulated bank rejection' : null;
    const proof = await this.ledger.submit('FinalizeDisbursement', [payout.id, job.outcome, bankReference, failureReason ?? ''],
      { name: job.outcome === 'SETTLED' ? 'DisbursementSettled' : 'DisbursementFailed', entityType: 'disbursement', entityId: payout.id,
        payload: { publicReference: payout.public_reference, amountPaise: Number(payout.amount_paise), status: job.outcome, bankReference, ownerMsp: payout.owner_msp } });
    await this.db.transaction(async (client) => {
      await client.query(`UPDATE allocations SET reserved_paise=reserved_paise-$1,disbursed_paise=disbursed_paise+$2 WHERE id=$3`,
        [payout.amount_paise, job.outcome === 'SETTLED' ? payout.amount_paise : 0, payout.allocation_id]);
      await client.query('UPDATE disbursements SET status=$1,bank_reference=$2,failure_reason=$3,proof=$4,updated_at=now() WHERE id=$5', [job.outcome, bankReference, failureReason, proof, payout.id]);
      await client.query('UPDATE payout_jobs SET completed_at=now(),attempts=attempts+1 WHERE id=$1', [job.id]);
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

  async beneficiaryView(id: string) {
    const { encryptionKey } = requireSecrets(); const b = (await this.db.query<any>('SELECT b.*,s.name scheme_name FROM beneficiaries b JOIN schemes s ON s.id=b.scheme_id WHERE b.id=$1', [id])).rows[0];
    if (!b) throw new NotFoundException();
    const payouts = await this.db.query<any>('SELECT public_reference,amount_paise,status,bank_reference,proof,created_at,updated_at FROM disbursements WHERE beneficiary_id=$1 ORDER BY created_at DESC', [id]);
    return { name: decryptPii(b.name_enc, encryptionKey), districtCode: b.district_code, schemeName: b.scheme_name, promisedPaise: Number(b.promised_paise),
      payments: payouts.rows.map((p) => ({ ...p, amount_paise: Number(p.amount_paise) })) };
  }
}
