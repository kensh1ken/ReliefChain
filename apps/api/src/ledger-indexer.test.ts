import { afterEach, describe, expect, it, vi } from 'vitest';
import { LedgerIndexerService } from './ledger-indexer.service';

const envelope = {
  schemaVersion: 1, eventType: 'DisbursementSettled', entityType: 'disbursement',
  entityId: '80000000-0000-4000-8000-000000000001', occurredAt: '2026-01-01T00:00:00.000Z',
  transactionId: 'transaction-000000000001', actorMsp: 'GovernmentMSP',
  payload: {
    publicReference: 'RC-2026-ABCD1234', allocationId: '40000000-0000-4000-8000-000000000001',
    amountPaise: 2500000, ownerMsp: 'GovernmentMSP', fromStatus: 'PENDING', toStatus: 'SETTLED',
    providerReferenceHash: `sha256:${'a'.repeat(64)}`
  }
} as const;

function fixtureEvent(overrides: Record<string, unknown> = {}) {
  return { blockNumber: 12n, transactionId: envelope.transactionId, chaincodeName: 'relief-funds',
    eventName: envelope.eventType, payload: Buffer.from(JSON.stringify(envelope)), ...overrides };
}

function fixtureDb() {
  const client = { query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [] }) };
  return { client, db: {
    query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ block_number: 0, updated_at: '2026-01-01T00:00:00.000Z' }] }),
    transaction: vi.fn(async (work: (value: typeof client) => Promise<unknown>) => work(client))
  } };
}

describe('LedgerIndexerService', () => {
  afterEach(() => { process.env.LEDGER_MODE = 'memory'; vi.restoreAllMocks(); });

  it('does not initialize a peer connection in memory mode', async () => {
    process.env.LEDGER_MODE = 'memory';
    const { db } = fixtureDb(); const indexer = new LedgerIndexerService(db as any);
    await indexer.onApplicationBootstrap();
    expect(db.query).not.toHaveBeenCalled();
    expect(indexer.getHealthStatus().indexerActive).toBe(false);
  });

  it('persists a validated event and checkpoint atomically', async () => {
    const { db, client } = fixtureDb(); const indexer = new LedgerIndexerService(db as any);
    await (indexer as any).processChaincodeEvent(fixtureEvent(), 'correlation-1');
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query.mock.calls[0][0]).toContain('INSERT INTO ledger_events');
    expect(client.query.mock.calls[1][0]).toContain('UPDATE indexer_checkpoint');
    expect(indexer.getState().lastProcessedBlock).toBe(12);
  });

  it('rejects an unsupported schema version without advancing the checkpoint', async () => {
    const { db, client } = fixtureDb(); const indexer = new LedgerIndexerService(db as any);
    const invalid = { ...envelope, schemaVersion: 2 };
    await expect((indexer as any).processChaincodeEvent(fixtureEvent({ payload: Buffer.from(JSON.stringify(invalid)) }), 'correlation-2')).rejects.toThrow('invalid v1 envelope');
    expect(client.query).not.toHaveBeenCalled();
    expect(indexer.getState().lastProcessedBlock).toBe(0);
  });

  it('rejects event metadata that disagrees with the signed payload', async () => {
    const { db } = fixtureDb(); const indexer = new LedgerIndexerService(db as any);
    await expect((indexer as any).processChaincodeEvent(fixtureEvent({ eventName: 'DisbursementFailed' }), 'correlation-3')).rejects.toThrow('eventType does not match');
  });

  it('resets only the privacy-safe audit index for replay', async () => {
    const { db, client } = fixtureDb(); const indexer = new LedgerIndexerService(db as any);
    await indexer.rebuildProjections(10);
    expect(client.query.mock.calls[0][0]).toContain('DELETE FROM ledger_events');
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('TRUNCATE'))).toBe(false);
    expect(indexer.getState().lastProcessedBlock).toBe(10);
  });
});
