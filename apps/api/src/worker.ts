import { Injectable, OnApplicationBootstrap, OnApplicationShutdown, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PayoutsService } from './payouts.service';
import { randomUUID } from 'node:crypto';

interface WorkerConfig {
  pollIntervalMs: number;
  leaseDurationSeconds: number;
  maxAttempts: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
  batchSize: number;
}

@Injectable()
export class PayoutWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(PayoutWorker.name);
  private timer?: NodeJS.Timeout;
  private workerId: string;
  private config: WorkerConfig;

  constructor(
    private db: DatabaseService,
    private payouts: PayoutsService
  ) {
    this.workerId = `worker-${process.pid}-${Date.now()}`;
    this.config = {
      pollIntervalMs: 1000,
      leaseDurationSeconds: 300, // 5 minutes
      maxAttempts: parseInt(process.env.WORKER_MAX_ATTEMPTS || '5', 10),
      baseRetryDelayMs: parseInt(process.env.WORKER_BASE_RETRY_DELAY_MS || '10000', 10), // 10 seconds
      maxRetryDelayMs: parseInt(process.env.WORKER_MAX_RETRY_DELAY_MS || '300000', 10), // 5 minutes
      batchSize: 5
    };
  }

  onApplicationBootstrap() {
    if (process.env.WORKER_ENABLED === 'false') {
      this.logger.log('Payout worker disabled by configuration');
      return;
    }
    this.logger.log(`Starting payout worker ${this.workerId}`);
    this.timer = setInterval(() => void this.tick(), this.config.pollIntervalMs);
    void this.tick();
  }

  onApplicationShutdown() {
    this.logger.log(`Stopping payout worker ${this.workerId}`);
    if (this.timer) clearInterval(this.timer);
    void this.releaseLeases();
  }

  private async releaseLeases() {
    try {
      await this.db.query(
        'UPDATE payout_jobs SET leased_until = NULL, leased_by = NULL, status = \'QUEUED\' WHERE leased_by = $1 AND status = \'LEASED\'',
        [this.workerId]
      );
      this.logger.log(`Released leases for worker ${this.workerId}`);
    } catch (error) {
      this.logger.error(`Failed to release leases: ${error}`);
    }
  }

  private async tick() {
    try {
      await this.processBatch();
    } catch (error) {
      this.logger.error(`Worker tick error: ${error}`);
    }
  }

  private async processBatch() {
    // First, clean up expired leases
    await this.cleanupExpiredLeases();

    // Try to lease and process jobs
    const jobs = await this.leaseJobs();
    
    if (jobs.length === 0) {
      return;
    }

    this.logger.debug(`Leased ${jobs.length} jobs for processing`);

    for (const job of jobs) {
      try {
        await this.processJob(job);
      } catch (error) {
        this.logger.error(`Failed to process job ${job.id}: ${error}`);
        await this.handleJobFailure(job, error);
      }
    }
  }

  private async cleanupExpiredLeases() {
    await this.db.query(
      'UPDATE payout_jobs SET leased_until = NULL, leased_by = NULL, status = \'QUEUED\' WHERE leased_until < now() AND status = \'LEASED\''
    );
  }

  private async leaseJobs(): Promise<any[]> {
    return this.db.transaction(async (client) => {
      // Use advisory lock to prevent multiple workers from leasing the same jobs
      const lockResult = await client.query('SELECT pg_try_advisory_xact_lock(123456) as acquired');
      if (!lockResult.rows[0].acquired) {
        return []; // Another worker is processing
      }

      // Find and lease available jobs
      const result = await client.query<any>(
        `UPDATE payout_jobs 
         SET leased_until = now() + interval '${this.config.leaseDurationSeconds} seconds',
             leased_by = $1,
             lease_version = lease_version + 1,
             status = 'LEASED'
         WHERE id IN (
           SELECT id FROM payout_jobs 
           WHERE completed_at IS NULL 
             AND status = 'QUEUED' 
             AND run_after <= now() 
             AND attempts < $2
           ORDER BY run_after 
           LIMIT $3
           FOR UPDATE SKIP LOCKED
         )
         RETURNING *`,
        [this.workerId, this.config.maxAttempts, this.config.batchSize]
      );

      return result.rows;
    });
  }

  private async processJob(job: any) {
    const correlationId = randomUUID();
    this.logger.debug(`Processing job ${job.id} (attempt ${job.attempts + 1}) with correlation ID: ${correlationId}`);
    
    await this.payouts.finalizeJob(job, correlationId);
    
    this.logger.debug(`Successfully processed job ${job.id} with correlation ID: ${correlationId}`);
  }

  private async handleJobFailure(job: any, error: any) {
    const nextAttempt = job.attempts + 1;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (nextAttempt >= this.config.maxAttempts) {
      // Move to dead letter
      await this.moveToDeadLetter(job, errorMessage);
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = this.calculateRetryDelay(nextAttempt);
      await this.scheduleRetry(job, nextAttempt, retryDelay, errorMessage);
    }
  }

  private calculateRetryDelay(attemptNumber: number): number {
    // Exponential backoff: base * 2^(attempt-1), capped at max
    const delay = this.config.baseRetryDelayMs * Math.pow(2, attemptNumber - 1);
    return Math.min(delay, this.config.maxRetryDelayMs);
  }

  private async scheduleRetry(job: any, nextAttempt: number, delayMs: number, errorMessage: string) {
    await this.db.query(
      `UPDATE payout_jobs 
       SET attempts = $1,
           last_error = $2,
           run_after = now() + interval '${delayMs} milliseconds',
           leased_until = NULL,
           leased_by = NULL,
           status = 'QUEUED',
           lease_version = lease_version + 1
       WHERE id = $3`,
      [nextAttempt, errorMessage, job.id]
    );
    
    this.logger.debug(`Scheduled retry ${nextAttempt}/${this.config.maxAttempts} for job ${job.id} in ${delayMs}ms`);
  }

  private async moveToDeadLetter(job: any, errorMessage: string) {
    await this.db.transaction(async (client) => {
      // Update job status
      await client.query(
        `UPDATE payout_jobs 
         SET status = 'DEAD_LETTERED',
             attempts = attempts + 1,
             last_error = $1,
             leased_until = NULL,
             leased_by = NULL,
             lease_version = lease_version + 1
         WHERE id = $2`,
        [errorMessage, job.id]
      );

      // Create dead letter record
      await client.query(
        `INSERT INTO dead_letter_jobs (payout_job_id, reason, attempts) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (payout_job_id) DO UPDATE 
         SET reason = $2, attempts = $3`,
        [job.id, errorMessage, job.attempts + 1]
      );
    });

    this.logger.error(`Moved job ${job.id} to dead letter after ${job.attempts + 1} attempts`);
  }
}
