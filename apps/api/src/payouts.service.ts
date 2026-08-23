import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import type { LedgerPort } from './ports';
import { LEDGER_PORT } from './ports';
import { PAYOUT_PROVIDER } from './payout-provider';
import type { PayoutProvider } from './payout-provider';
import type { SessionUser } from './auth';
import { requireOrganization } from './authorization';

@Injectable()
export class PayoutsService {
  constructor(private db: DatabaseService, @Inject(LEDGER_PORT) private ledger: LedgerPort, @Inject(PAYOUT_PROVIDER) private provider: PayoutProvider) {}

  async finalizeJob(job: any) {
    return this.db.transaction(async (client) => {
      // Lock the payout job and disbursement for update
      const jobResult = await client.query<any>('SELECT * FROM payout_jobs WHERE id=$1 FOR UPDATE', [job.id]);
      const currentJob = jobResult.rows[0];
      if (!currentJob || currentJob.completed_at) return; // Already processed

      const payoutResult = await client.query<any>('SELECT d.*,a.owner_msp FROM disbursements d JOIN allocations a ON a.id=d.allocation_id WHERE d.id=$1 FOR UPDATE', [job.disbursement_id]);
      const payout = payoutResult.rows[0];
      if (!payout || payout.status !== 'PENDING') return;

      const attempt = await client.query<any>('SELECT COALESCE(max(attempt_number),0)+1 attempt_number FROM payout_attempts WHERE disbursement_id=$1', [payout.id]);
      const attemptNumber = Number(attempt.rows[0].attempt_number);
      const providerResult = await this.provider.submit({ disbursementId: payout.id, amountPaise: Number(payout.amount_paise), requestedOutcome: job.outcome });
      
      // Record the attempt
      await client.query(`INSERT INTO payout_attempts(disbursement_id,attempt_number,status,provider_reference,error_code,error_message,completed_at) VALUES($1,$2,$3,$4,$5,$6,now())`, [payout.id, attemptNumber, providerResult.status, providerResult.providerReference, providerResult.errorCode, providerResult.errorMessage]);

      if (providerResult.status === 'UNKNOWN') {
        await client.query(`UPDATE disbursements SET status='UNKNOWN',failure_reason=$1,updated_at=now() WHERE id=$2`, [providerResult.errorMessage, payout.id]);
        await client.query('INSERT INTO disbursement_status_history(disbursement_id,from_status,to_status,reason,metadata) VALUES($1,$2,$3,$4,$5)', [payout.id, 'PENDING', 'UNKNOWN', providerResult.errorMessage, JSON.stringify({ providerReference: providerResult.providerReference })]);
        await client.query('UPDATE payout_jobs SET completed_at=now(),attempts=attempts+1,status=\'COMPLETED\' WHERE id=$1', [job.id]);
        await client.query('INSERT INTO outbox_events(event_type,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,$4)', ['DisbursementUnknown', 'disbursement', payout.id, JSON.stringify({ id: payout.id, status: 'UNKNOWN', providerReference: providerResult.providerReference })]);
        return;
      }

      const bankReference = providerResult.providerReference, failureReason = providerResult.errorMessage;
      const proof = await this.ledger.submit('FinalizeDisbursement', [payout.id, providerResult.status, bankReference ?? '', failureReason ?? ''],
        { name: providerResult.status === 'SETTLED' ? 'DisbursementSettled' : 'DisbursementFailed', entityType: 'disbursement', entityId: payout.id,
          payload: { publicReference: payout.public_reference, amountPaise: Number(payout.amount_paise), status: providerResult.status, bankReference, ownerMsp: payout.owner_msp } });
      
      await client.query(`UPDATE allocations SET reserved_paise=reserved_paise-$1,disbursed_paise=disbursed_paise+$2 WHERE id=$3`,
        [payout.amount_paise, providerResult.status === 'SETTLED' ? payout.amount_paise : 0, payout.allocation_id]);
      await client.query('UPDATE disbursements SET status=$1,bank_reference=$2,failure_reason=$3,proof=$4,updated_at=now() WHERE id=$5', [providerResult.status, bankReference, failureReason, proof, payout.id]);
      await client.query('INSERT INTO disbursement_status_history(disbursement_id,from_status,to_status,reason,metadata) VALUES($1,$2,$3,$4,$5)', [payout.id, 'PENDING', providerResult.status, failureReason, JSON.stringify({ providerReference: bankReference })]);
      await client.query('UPDATE payout_jobs SET completed_at=now(),attempts=attempts+1,status=\'COMPLETED\' WHERE id=$1', [job.id]);
      await client.query('INSERT INTO outbox_events(event_type,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,$4)', [providerResult.status === 'SETTLED' ? 'DisbursementSettled' : 'DisbursementFailed', 'disbursement', payout.id, JSON.stringify({ id: payout.id, status: providerResult.status, providerReference: bankReference })]);
    });
  }

  async reconcile(id: string, providerReference: string, user: { orgMsp?: string }) {
    const current = await this.db.query<any>('SELECT d.*,a.owner_msp FROM disbursements d JOIN allocations a ON a.id=d.allocation_id WHERE d.id=$1', [id]);
    const payout = current.rows[0];
    if (!payout) throw new Error('Disbursement not found');
    if (payout.owner_msp !== user.orgMsp) throw new Error('Disbursement belongs to another organization');
    if (payout.status !== 'UNKNOWN') throw new Error('Only UNKNOWN payouts can be reconciled');
    const attempt = await this.db.query<any>('SELECT * FROM payout_attempts WHERE disbursement_id=$1 AND provider_reference=$2', [id, providerReference]);
    if (!attempt.rowCount) throw new Error('Provider reference does not match the payout');
    const result = await this.provider.reconcile(providerReference);
    if (result.status === 'UNKNOWN') return { id, status: 'UNKNOWN', providerReference };
    const proof = await this.ledger.submit('FinalizeDisbursement', [id, result.status, providerReference, result.errorMessage ?? ''], { name: result.status === 'SETTLED' ? 'DisbursementSettled' : 'DisbursementFailed', entityType: 'disbursement', entityId: id, payload: { publicReference: payout.public_reference, amountPaise: Number(payout.amount_paise), status: result.status, bankReference: providerReference, ownerMsp: payout.owner_msp } });
    await this.db.transaction(async (client) => {
      await client.query('UPDATE allocations SET reserved_paise=reserved_paise-$1,disbursed_paise=disbursed_paise+$2 WHERE id=$3', [payout.amount_paise, result.status === 'SETTLED' ? payout.amount_paise : 0, payout.allocation_id]);
      await client.query('UPDATE disbursements SET status=$1,bank_reference=$2,failure_reason=$3,proof=$4,updated_at=now() WHERE id=$5', [result.status, providerReference, result.errorMessage, proof, id]);
      await client.query('INSERT INTO disbursement_status_history(disbursement_id,from_status,to_status,reason,metadata) VALUES($1,$2,$3,$4,$5)', [id, 'UNKNOWN', result.status, result.errorMessage, JSON.stringify({ providerReference })]);
      await client.query('INSERT INTO outbox_events(event_type,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,$4)', [result.status === 'SETTLED' ? 'DisbursementSettled' : 'DisbursementFailed', 'disbursement', id, JSON.stringify({ id, status: result.status, providerReference })]);
    });
    return { id, status: result.status, providerReference, proof };
  }

  async getRetryHistory(disbursementId: string, user: SessionUser) {
    // Verify ownership
    const payout = await this.db.query<any>('SELECT d.*, a.owner_msp FROM disbursements d JOIN allocations a ON a.id = d.allocation_id WHERE d.id = $1', [disbursementId]);
    if (!payout.rowCount) throw new NotFoundException('Disbursement not found');
    requireOrganization(user, payout.rows[0].owner_msp);

    // Get job and attempts
    const job = await this.db.query<any>('SELECT * FROM payout_jobs WHERE disbursement_id = $1', [disbursementId]);
    const attempts = await this.db.query<any>('SELECT * FROM payout_attempts WHERE disbursement_id = $1 ORDER BY attempt_number', [disbursementId]);

    return {
      disbursementId,
      job: job.rows[0] || null,
      attempts: attempts.rows
    };
  }

  async getDeadLetters(user: SessionUser) {
    const result = await this.db.query<any>(
      `SELECT dl.*, pj.disbursement_id, d.public_reference, d.amount_paise, a.owner_msp
       FROM dead_letter_jobs dl
       JOIN payout_jobs pj ON dl.payout_job_id = pj.id
       JOIN disbursements d ON pj.disbursement_id = d.id
       JOIN allocations a ON d.allocation_id = a.id
       WHERE a.owner_msp = $1
       ORDER BY dl.created_at DESC`,
      [user.orgMsp]
    );

    return result.rows;
  }

  async retryDeadLetter(deadLetterId: string, user: SessionUser) {
    return this.db.transaction(async (client) => {
      // Get dead letter and verify ownership
      const dl = await client.query<any>(
        `SELECT dl.*, pj.disbursement_id, d.status as disbursement_status, a.owner_msp
         FROM dead_letter_jobs dl
         JOIN payout_jobs pj ON dl.payout_job_id = pj.id
         JOIN disbursements d ON pj.disbursement_id = d.id
         JOIN allocations a ON d.allocation_id = a.id
         WHERE dl.id = $1`,
        [deadLetterId]
      );

      if (!dl.rowCount) throw new NotFoundException('Dead letter not found');
      requireOrganization(user, dl.rows[0].owner_msp);

      const deadLetter = dl.rows[0];

      // Check if already resolved
      if (deadLetter.resolved_at) throw new ForbiddenException('Dead letter already resolved');

      // Reset the job for retry
      await client.query(
        `UPDATE payout_jobs 
         SET status = 'QUEUED',
             attempts = 0,
             leased_until = NULL,
             leased_by = NULL,
             run_after = now(),
             last_error = NULL
         WHERE id = $1`,
        [deadLetter.payout_job_id]
      );

      // Mark dead letter as resolved
      await client.query(
        `UPDATE dead_letter_jobs 
         SET resolved_at = now(),
             resolved_by = $1,
             resolution = 'Manually retried'
         WHERE id = $2`,
        [user.sub, deadLetterId]
      );

      return { id: deadLetterId, status: 'retried', disbursementId: deadLetter.disbursement_id };
    });
  }

  async resolveDeadLetter(deadLetterId: string, resolution: string, user: SessionUser) {
    return this.db.transaction(async (client) => {
      // Get dead letter and verify ownership
      const dl = await client.query<any>(
        `SELECT dl.*, a.owner_msp
         FROM dead_letter_jobs dl
         JOIN payout_jobs pj ON dl.payout_job_id = pj.id
         JOIN disbursements d ON pj.disbursement_id = d.id
         JOIN allocations a ON d.allocation_id = a.id
         WHERE dl.id = $1`,
        [deadLetterId]
      );

      if (!dl.rowCount) throw new NotFoundException('Dead letter not found');
      requireOrganization(user, dl.rows[0].owner_msp);

      const deadLetter = dl.rows[0];

      // Check if already resolved
      if (deadLetter.resolved_at) throw new ForbiddenException('Dead letter already resolved');

      // Mark job as completed without retry
      await client.query(
        `UPDATE payout_jobs 
         SET status = 'COMPLETED',
             completed_at = now(),
             leased_until = NULL,
             leased_by = NULL
         WHERE id = $1`,
        [deadLetter.payout_job_id]
      );

      // Mark dead letter as resolved
      await client.query(
        `UPDATE dead_letter_jobs 
         SET resolved_at = now(),
             resolved_by = $1,
             resolution = $2
         WHERE id = $3`,
        [user.sub, resolution, deadLetterId]
      );

      return { id: deadLetterId, status: 'resolved', resolution };
    });
  }
}