import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LedgerIndexerService } from './ledger-indexer.service';
import { DatabaseService } from './database.service';

// Mock dependencies
vi.mock('./database.service');
vi.mock('@hyperledger/fabric-gateway');
vi.mock('node:fs/promises');
vi.mock('node:crypto');

describe('LedgerIndexerService', () => {
  let indexer: LedgerIndexerService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    mockDb = new DatabaseService();
    indexer = new LedgerIndexerService(mockDb);
    
    // Set environment for Fabric mode
    process.env.LEDGER_MODE = 'fabric';
    process.env.INDEXER_SYNC_INTERVAL_MS = '1000';
    process.env.INDEXER_MAX_RETRIES = '3';
    process.env.INDEXER_RETRY_DELAY_MS = '100';
    process.env.INDEXER_BATCH_SIZE = '5';
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env.LEDGER_MODE = 'memory';
  });

  describe('Initialization', () => {
    it('should skip initialization in memory mode', async () => {
      process.env.LEDGER_MODE = 'memory';
      const memoryIndexer = new LedgerIndexerService(mockDb);
      
      await memoryIndexer.onApplicationBootstrap();
      
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should load checkpoint on startup in Fabric mode', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [{ block_number: 100, updated_at: '2026-01-01T00:00:00Z' }],
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      vi.spyOn(indexer as any, 'initializeGateway').mockResolvedValue(undefined);

      await indexer.onApplicationBootstrap();

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT block_number, updated_at FROM indexer_checkpoint WHERE id = 1'
      );
    });

    it('should start from block 0 if checkpoint fails to load', async () => {
      vi.spyOn(mockDb, 'query').mockRejectedValue(new Error('Database error'));
      vi.spyOn(indexer as any, 'initializeGateway').mockResolvedValue(undefined);

      await indexer.onApplicationBootstrap();

      const state = indexer.getState();
      expect(state.lastProcessedBlock).toBe(0);
    });
  });

  describe('Checkpoint Management', () => {
    it('should save checkpoint successfully', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);

      await indexer['saveCheckpoint'](150, 1000);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE indexer_checkpoint'),
        expect.arrayContaining([150, 1000])
      );
    });

    it('should handle checkpoint save errors gracefully', async () => {
      vi.spyOn(mockDb, 'query').mockRejectedValue(new Error('Save failed'));
      vi.spyOn(indexer as any, 'updateIndexerError').mockResolvedValue(undefined);

      await indexer['saveCheckpoint'](150);

      expect(indexer['updateIndexerError']).toHaveBeenCalled();
    });

    it('should update indexer error state', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);

      await indexer['updateIndexerError'](new Error('Test error'));

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE indexer_checkpoint'),
        expect.arrayContaining([expect.stringContaining('Test error')])
      );
    });
  });

  describe('Event Processing Idempotency', () => {
    it('should skip already processed transactions', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const transaction = {
        payload: {
          header: { channel_header: { tx_id: 'existing-tx-id' } }
        }
      };

      await indexer['processTransaction'](transaction, 100, 'test-correlation');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT 1 FROM ledger_events WHERE transaction_id = $1',
        ['existing-tx-id']
      );
    });

    it('should skip already processed events', async () => {
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({
          rowCount: 0,
          rows: [],
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any) // Transaction check
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [],
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any); // Event check

      const event = {
        name: 'DisbursementSettled',
        entityType: 'disbursement',
        entityId: 'disb-123',
        payload: {}
      };

      await indexer['processEvent'](event, 'new-tx-id', 100, 'test-correlation');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT 1 FROM ledger_events WHERE transaction_id = $1 AND event_name = $2 AND entity_id = $3',
        ['new-tx-id', 'DisbursementSettled', 'disb-123']
      );
    });
  });

  describe('Projection Updates', () => {
    it('should update disbursement projection for settled event', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);

      const event = {
        name: 'DisbursementSettled',
        entityType: 'disbursement',
        entityId: 'disb-123',
        payload: {
          bankReference: 'BANK-REF-123',
          amountPaise: 1000,
          allocationId: 'alloc-123'
        }
      };

      await indexer['updateDisbursementSettled'](event, 'tx-123', 'test-correlation');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE disbursements'),
        expect.arrayContaining([expect.stringContaining('BANK-REF-123')])
      );
    });

    it('should update allocation balance on settlement', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);

      const event = {
        name: 'DisbursementSettled',
        entityType: 'disbursement',
        entityId: 'disb-123',
        payload: {
          bankReference: 'BANK-REF-123',
          amountPaise: 1000,
          allocationId: 'alloc-123'
        }
      };

      await indexer['updateDisbursementSettled'](event, 'tx-123', 'test-correlation');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE allocations'),
        expect.arrayContaining([1000, 'alloc-123'])
      );
    });

    it('should handle failed disbursement events', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);

      const event = {
        name: 'DisbursementFailed',
        entityType: 'disbursement',
        entityId: 'disb-123',
        payload: {
          failureReason: 'Insufficient funds',
          amountPaise: 1000,
          allocationId: 'alloc-123'
        }
      };

      await indexer['updateDisbursementFailed'](event, 'tx-123', 'test-correlation');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE disbursements'),
        expect.arrayContaining([expect.stringContaining('Insufficient funds')])
      );
    });

    it('should handle reversal events', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);

      const event = {
        name: 'DisbursementReversed',
        entityType: 'disbursement',
        entityId: 'disb-123',
        payload: {
          reason: 'Fraud detected',
          amountPaise: 1000,
          allocationId: 'alloc-123'
        }
      };

      await indexer['updateDisbursementReversed'](event, 'tx-123', 'test-correlation');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE disbursements'),
        expect.arrayContaining([expect.stringContaining('Fraud detected')])
      );
    });
  });

  describe('Block Processing', () => {
    it('should calculate projection lag correctly', async () => {
      vi.spyOn(indexer as any, 'getBlockchainHeight').mockResolvedValue(200);
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);
      vi.spyOn(indexer as any, 'processBlockRange').mockResolvedValue(undefined);

      indexer['state'].lastProcessedBlock = 180;

      await indexer['processBlocks']();

      expect(indexer['state'].projectionLag).toBe(20);
    });

    it('should skip processing when up to date', async () => {
      vi.spyOn(indexer as any, 'getBlockchainHeight').mockResolvedValue(180);
      indexer['state'].lastProcessedBlock = 180;

      await indexer['processBlocks']();

      expect(indexer['state'].projectionLag).toBe(0);
    });

    it('should process blocks in batches', async () => {
      vi.spyOn(indexer as any, 'getBlockchainHeight').mockResolvedValue(25);
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);
      vi.spyOn(indexer as any, 'processBlockRange').mockResolvedValue(undefined);

      indexer['state'].lastProcessedBlock = 0;
      (indexer as any).config.batchSize = 10;

      await indexer['processBlocks']();

      expect(indexer['processBlockRange']).toHaveBeenCalledTimes(3); // 0-9, 10-19, 20-25
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed events gracefully', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);

      const invalidEvent = {
        name: 'InvalidEvent',
        entityType: 'test',
        entityId: 'test-123',
        payload: {}
      };

      // Should not throw for unknown event types
      await expect(indexer['updateProjections'](invalidEvent, 'tx-123', 'test-correlation')).resolves.not.toThrow();
    });

    it('should continue processing after block failure', async () => {
      vi.spyOn(indexer as any, 'getBlockchainHeight').mockResolvedValue(10);
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);
      vi.spyOn(indexer as any, 'processSingleBlock')
        .mockRejectedValueOnce(new Error('Block 5 failed'))
        .mockResolvedValue(undefined);

      indexer['state'].lastProcessedBlock = 0;

      await indexer['processBlocks']();

      // Should still update checkpoint despite failure
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE indexer_checkpoint'),
        expect.anything()
      );
    });

    it('should implement retry logic on sync errors', async () => {
      vi.spyOn(indexer as any, 'processBlocks').mockRejectedValue(new Error('Sync failed'));
      vi.spyOn(indexer as any, 'sync').mockRejectedValueOnce(new Error('First attempt'))
        .mockRejectedValueOnce(new Error('Second attempt'))
        .mockResolvedValue(undefined);

      (indexer as any).config.maxRetries = 3;

      await indexer['handleSyncError'](new Error('Test error'));

      expect(indexer['sync']).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Health Status', () => {
    it('should return current indexer state', () => {
      indexer['state'] = {
        lastProcessedBlock: 100,
        lastProcessedTransaction: 'tx-123',
        lastProcessedEvent: 'DisbursementSettled:disb-123',
        isProcessing: false,
        projectionLag: 5,
        lastSyncTime: '2026-01-01T00:00:00Z'
      };

      const state = indexer.getState();

      expect(state.lastProcessedBlock).toBe(100);
      expect(state.projectionLag).toBe(5);
      expect(state.isProcessing).toBe(false);
    });

    it('should return health status with ledger mode', async () => {
      process.env.LEDGER_MODE = 'fabric';
      const health = await indexer.getHealthStatus();

      expect(health.ledgerMode).toBe('fabric');
      expect(health.indexerActive).toBe(true);
      expect(health.lastProcessedBlock).toBeDefined();
      expect(health.projectionLag).toBeDefined();
    });

    it('should indicate inactive indexer in memory mode', async () => {
      process.env.LEDGER_MODE = 'memory';
      const health = await indexer.getHealthStatus();

      expect(health.ledgerMode).toBe('memory');
      expect(health.indexerActive).toBe(false);
    });
  });

  describe('Projection Rebuild', () => {
    it('should clear events and reset checkpoint on rebuild', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'DELETE',
        oid: 0,
        fields: []
      } as any);
      vi.spyOn(indexer as any, 'processBlocks').mockResolvedValue(undefined);

      await indexer.rebuildProjections(50);

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM ledger_events WHERE block_number >= $1',
        [50]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE indexer_checkpoint SET block_number = $1, updated_at = now() WHERE id = 1',
        [49]
      );
    });

    it('should track rebuild status', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [],
        command: 'INSERT',
        oid: 0,
        fields: []
      } as any);
      vi.spyOn(indexer as any, 'processBlocks').mockResolvedValue(undefined);

      await indexer.rebuildProjections(0);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO projection_rebuilds'),
        expect.anything()
      );
    });

    it('should handle rebuild errors gracefully', async () => {
      vi.spyOn(mockDb, 'query').mockRejectedValue(new Error('Rebuild failed'));

      await expect(indexer.rebuildProjections(0)).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use configurable sync interval', () => {
      process.env.INDEXER_SYNC_INTERVAL_MS = '5000';
      const customIndexer = new LedgerIndexerService(mockDb);
      
      expect(customIndexer['config'].syncIntervalMs).toBe(5000);
    });

    it('should use configurable batch size', () => {
      process.env.INDEXER_BATCH_SIZE = '20';
      const customIndexer = new LedgerIndexerService(mockDb);
      
      expect(customIndexer['config'].batchSize).toBe(20);
    });

    it('should use configurable retry settings', () => {
      process.env.INDEXER_MAX_RETRIES = '5';
      process.env.INDEXER_RETRY_DELAY_MS = '30000';
      const customIndexer = new LedgerIndexerService(mockDb);
      
      expect(customIndexer['config'].maxRetries).toBe(5);
      expect(customIndexer['config'].retryDelayMs).toBe(30000);
    });
  });

  describe('Memory Mode Labeling', () => {
    it('should label memory mode receipts correctly', async () => {
      process.env.LEDGER_MODE = 'memory';
      
      // This is tested in ledger.ts, but we verify the indexer respects the mode
      const health = await indexer.getHealthStatus();
      
      expect(health.ledgerMode).toBe('memory');
      expect(health.indexerActive).toBe(false);
    });
  });
});
