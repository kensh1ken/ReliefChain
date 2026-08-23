import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import type { LedgerPort } from './ports';
import { LEDGER_PORT } from './ports';

@Injectable()
export class PayoutsService {
  constructor(private db: DatabaseService, @Inject(LEDGER_PORT) private ledger: LedgerPort) {}

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
}