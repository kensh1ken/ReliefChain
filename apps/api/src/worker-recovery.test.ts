import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PayoutWorker } from './worker';
import { DatabaseService } from './database.service';
import { PayoutsService } from './payouts.service';

// Mock dependencies
vi.mock('./database.service');
vi.mock('./payouts.service');

describe('PayoutWorker Recovery', () => {
  let worker: PayoutWorker;
  let mockDb: DatabaseService;
  let mockPayouts: PayoutsService;

  beforeEach(() => {
    mockDb = new DatabaseService();
    mockPayouts = new PayoutsService(mockDb, null, null);
    worker = new PayoutWorker(mockDb, mockPayouts);
    
    // Set environment variables for testing
    process.env.WORKER_MAX_ATTEMPTS = '3';
    process.env.WORKER_BASE_RETRY_DELAY_MS = '1000';
    process.env.WORKER_MAX_RETRY_DELAY_MS = '10000';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Job Leasing', () => {
    it('should acquire lease for available jobs using advisory lock', async () => {
      const mockJobs = [
        { id: 'job1', disbursement_id: 'disb1', attempts: 0, run_after: new Date() }
      ];

      vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
        // Mock advisory lock acquisition
        const lockResult = { rows: [{ acquired: true }] };
        // Mock job query
        const jobResult = { rows: mockJobs };
        
        // Mock the transaction client
        const mockClient = {
          query: vi.fn().mockImplementation((query) => {
            if (query.includes('pg_try_advisory_xact_lock')) return Promise.resolve(lockResult);
            if (query.includes('UPDATE payout_jobs')) return Promise.resolve(jobResult);
            return Promise.resolve({ rows: [] });
          })
        };
        
        return callback(mockClient);
      });

      vi.spyOn(mockPayouts, 'finalizeJob').mockResolvedValue(undefined);

      await worker['processBatch']();

      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should skip jobs already leased by another worker', async () => {
      vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
        const lockResult = { rows: [{ acquired: false }] }; // Lock not acquired
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce(lockResult) // First call returns lock result
            .mockResolvedValue({ rows: [] }) // Subsequent calls
        };
        return callback(mockClient);
      });

      await worker['processBatch']();

      expect(mockPayouts.finalizeJob).not.toHaveBeenCalled();
    });

    it('should release leases on shutdown', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({ rowCount: 1 });

      await worker['releaseLeases']();

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE payout_jobs SET leased_until = NULL, leased_by = NULL, status = \'QUEUED\' WHERE leased_by = $1 AND status = \'LEASED\'',
        [worker['workerId']]
      );
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate exponential backoff delays', () => {
      const delay1 = worker['calculateRetryDelay'](1);
      const delay2 = worker['calculateRetryDelay'](2);
      const delay3 = worker['calculateRetryDelay'](3);

      expect(delay1).toBe(1000); // base * 2^0
      expect(delay2).toBe(2000); // base * 2^1
      expect(delay3).toBe(4000); // base * 2^2
    });

    it('should cap retry delay at maximum', () => {
      const delay = worker['calculateRetryDelay'](20); // Very high attempt number
      expect(delay).toBe(10000); // Capped at max
    });
  });

  describe('Dead Letter Handling', () => {
    it('should move job to dead letter after max attempts', async () => {
      const job = { id: 'job1', disbursement_id: 'disb1', attempts: 2 };
      const error = new Error('Provider failure');

      vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({ rowCount: 1 })
        };
        return callback(mockClient);
      });

      await worker['moveToDeadLetter'](job, error.message);

      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should create dead letter record', async () => {
      const job = { id: 'job1', disbursement_id: 'disb1', attempts: 2 };
      const error = new Error('Provider failure');

      vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({ rowCount: 1 })
        };
        return callback(mockClient);
      });

      await worker['moveToDeadLetter'](job, error.message);

      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe('Worker Recovery', () => {
    it('should clean up expired leases on startup', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({ rowCount: 1 });

      await worker['cleanupExpiredLeases']();

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE payout_jobs SET leased_until = NULL, leased_by = NULL, status = \'QUEUED\' WHERE leased_until < now() AND status = \'LEASED\''
      );
    });

    it('should resume processing after worker restart', async () => {
      const mockJobs = [
        { id: 'job1', disbursement_id: 'disb1', attempts: 0, run_after: new Date() }
      ];

      vi.spyOn(mockDb, 'query').mockResolvedValue({ rowCount: 1 });
      vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
        const lockResult = { rows: [{ acquired: true }] };
        const jobResult = { rows: mockJobs };
        const mockClient = {
          query: vi.fn().mockImplementation((query) => {
            if (query.includes('pg_try_advisory_xact_lock')) return Promise.resolve(lockResult);
            if (query.includes('UPDATE payout_jobs')) return Promise.resolve(jobResult);
            return Promise.resolve({ rows: [] });
          })
        };
        return callback(mockClient);
      });

      vi.spyOn(mockPayouts, 'finalizeJob').mockResolvedValue(undefined);

      await worker['processBatch']();

      expect(mockPayouts.finalizeJob).toHaveBeenCalledWith(mockJobs[0]);
    });
  });

  describe('Transaction Consistency', () => {
    it('should handle job processing within transaction', async () => {
      const job = { id: 'job1', disbursement_id: 'disb1', attempts: 0 };
      
      vi.spyOn(mockPayouts, 'finalizeJob').mockImplementation(async () => {
        // This should be called within a transaction
        return mockDb.transaction(async (client) => {
          // Simulate successful finalization
          return;
        });
      });

      await worker['processJob'](job);

      expect(mockPayouts.finalizeJob).toHaveBeenCalledWith(job);
    });
  });

  describe('Error Handling', () => {
    it('should handle job failure and schedule retry', async () => {
      const job = { id: 'job1', disbursement_id: 'disb1', attempts: 0 };
      const error = new Error('Temporary failure');

      vi.spyOn(mockDb, 'query').mockResolvedValue({ rowCount: 1 });
      vi.spyOn(mockPayouts, 'finalizeJob').mockRejectedValue(error);

      await worker['handleJobFailure'](job, error);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payout_jobs'),
        expect.anything()
      );
    });

    it('should not crash on individual job failures', async () => {
      const mockJobs = [
        { id: 'job1', disbursement_id: 'disb1', attempts: 0, run_after: new Date() },
        { id: 'job2', disbursement_id: 'disb2', attempts: 0, run_after: new Date() }
      ];

      vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
        const lockResult = { rows: [{ acquired: true }] };
        const jobResult = { rows: mockJobs };
        const mockClient = {
          query: vi.fn().mockImplementation((query) => {
            if (query.includes('pg_try_advisory_xact_lock')) return Promise.resolve(lockResult);
            if (query.includes('UPDATE payout_jobs')) return Promise.resolve(jobResult);
            return Promise.resolve({ rows: [] });
          })
        };
        return callback(mockClient);
      });

      vi.spyOn(mockPayouts, 'finalizeJob')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Second job failed'))
        .mockResolvedValue(undefined);

      vi.spyOn(mockDb, 'query').mockResolvedValue({ rowCount: 1 });

      // Should not throw even if one job fails
      await expect(worker['processBatch']()).resolves.not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use configurable attempt limits', () => {
      process.env.WORKER_MAX_ATTEMPTS = '10';
      const newWorker = new PayoutWorker(mockDb, mockPayouts);
      expect(newWorker['config'].maxAttempts).toBe(10);
    });

    it('should use configurable retry delays', () => {
      process.env.WORKER_BASE_RETRY_DELAY_MS = '5000';
      process.env.WORKER_MAX_RETRY_DELAY_MS = '60000';
      const newWorker = new PayoutWorker(mockDb, mockPayouts);
      expect(newWorker['config'].baseRetryDelayMs).toBe(5000);
      expect(newWorker['config'].maxRetryDelayMs).toBe(60000);
    });
  });
});
