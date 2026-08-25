import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditController } from './controllers/audit.controller';
import { DatabaseService } from './database.service';
import { LedgerRepository } from './repositories/ledger.repository';
import { RateLimitService } from './rate-limit.service';

// Mock dependencies
vi.mock('./database.service');
vi.mock('./repositories/ledger.repository');
vi.mock('./rate-limit.service');

describe('AuditController', () => {
  let controller: AuditController;
  let mockDb: DatabaseService;
  let mockLedgerEvents: LedgerRepository;
  let mockRateLimit: RateLimitService;
  let mockIndexer: any;

  beforeEach(() => {
    mockDb = new DatabaseService();
    mockLedgerEvents = new LedgerRepository(mockDb);
    mockRateLimit = new RateLimitService(mockDb);
    
    // Simple mock for indexer
    mockIndexer = {
      getState: vi.fn().mockReturnValue({
        projectionLag: 5,
        lastProcessedBlock: 100,
        lastSyncTime: '2026-01-01T00:00:00Z'
      })
    };
    
    controller = new AuditController(mockDb, mockLedgerEvents, mockRateLimit, mockIndexer);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Events with filters', () => {
    it('should filter events by type', async () => {
      vi.spyOn(mockRateLimit, 'check').mockResolvedValue(undefined);
      vi.spyOn(mockLedgerEvents, 'listEvents').mockResolvedValue({
        items: [{ event_name: 'DisbursementSettled', entity_type: 'disbursement' }],
        nextBeforeSequence: null
      });

      const result = await controller.events('DisbursementSettled');

      expect(mockLedgerEvents.listEvents).toHaveBeenCalledWith({
        type: 'DisbursementSettled',
        beforeSequence: undefined,
        limit: 100
      });
    });

    it('should limit results to 500 maximum', async () => {
      vi.spyOn(mockRateLimit, 'check').mockResolvedValue(undefined);
      vi.spyOn(mockLedgerEvents, 'listEvents').mockResolvedValue({
        items: [],
        nextBeforeSequence: null
      });

      await controller.events(undefined, undefined, '1000');

      expect(mockLedgerEvents.listEvents).toHaveBeenCalledWith({
        type: undefined,
        beforeSequence: undefined,
        limit: 500
      });
    });
  });

  describe('Reconciliation with filters', () => {
    it('should filter reconciliation by organization', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [{ id: '1', name: 'Test Fund', owner_msp: 'GovernmentMSP' }],
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const result = await controller.reconciliation('GovernmentMSP');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1 AND fs.owner_msp = $'),
        expect.arrayContaining(['GovernmentMSP'])
      );
    });
  });

  describe('Export with manifest', () => {
    it('should generate CSV with manifest', async () => {
      vi.spyOn(mockRateLimit, 'check').mockResolvedValue(undefined);
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [{ public_reference: 'RC-2026-TEST', amount_paise: 1000 }],
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const result = await controller.csv({ ip: '127.0.0.1' } as any);

      expect(result).toContain('# MANIFEST:');
      expect(result).toContain('public_reference');
    });

    it('should generate JSON export with manifest', async () => {
      vi.spyOn(mockRateLimit, 'check').mockResolvedValue(undefined);
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [{ public_reference: 'RC-2026-TEST', amount_paise: 1000 }],
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const result = await controller.jsonExport({ ip: '127.0.0.1' } as any);

      expect(result.manifest).toBeDefined();
      expect(result.manifest.exportedAt).toBeDefined();
      expect(result.manifest.rowCount).toBe(1);
      expect(result.manifest.contentHash).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });

  describe('Investigation annotations', () => {
    it('should get annotations for entity', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValue({
        rowCount: 1,
        rows: [{ id: '1', note: 'Investigation note' }],
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const result = await controller.getAnnotations('disbursement', 'disb-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE entity_type = $1 AND entity_id = $2'),
        expect.arrayContaining(['disbursement', 'disb-123'])
      );
    });
  });
});
