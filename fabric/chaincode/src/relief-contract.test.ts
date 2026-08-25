import { beforeEach, describe, expect, it } from 'vitest';
import { ledgerEventEnvelopeSchema, ledgerTransactionSchemas } from '@reliefchain/contracts';
import { ReliefFundsContract } from './relief-contract';

const ids = {
  disaster: '10000000-0000-4000-8000-000000000001',
  scheme: '20000000-0000-4000-8000-000000000001',
  source: '30000000-0000-4000-8000-000000000001',
  allocation: '40000000-0000-4000-8000-000000000001',
  payout: '80000000-0000-4000-8000-000000000001'
};

function harness() {
  const state = new Map<string, Buffer>();
  const events: Array<{ name: string; payload: unknown }> = [];
  let tx = 0;
  const ctx: any = {
    clientIdentity: { getMSPID: () => 'GovernmentMSP', getAttributeValue: (name: string) => name === 'role' ? 'GOVERNMENT' : null },
    stub: {
      getState: async (key: string) => state.get(key) ?? Buffer.alloc(0),
      putState: async (key: string, value: Buffer) => { state.set(key, value); },
      getTxTimestamp: () => ({ seconds: 1767225600, nanos: 0 }),
      getTxID: () => `transaction-${String(tx).padStart(10, '0')}`,
      setEvent: (name: string, value: Buffer) => events.push({ name, payload: JSON.parse(value.toString()) })
    }
  };
  return { ctx, state, events, next: () => { tx += 1; } };
}

describe('ReliefFundsContract v1 wire contract', () => {
  let contract: ReliefFundsContract;
  beforeEach(() => { contract = new ReliefFundsContract(); });

  it('returns privacy-safe views and emits validated envelopes for the frozen workflow', async () => {
    const h = harness();
    const run = async (transaction: keyof typeof ledgerTransactionSchemas, work: () => Promise<string>) => {
      h.next();
      const result = JSON.parse(await work());
      (ledgerTransactionSchemas[transaction].result as any).parse(result);
      const emitted = h.events.at(-1)!;
      expect(emitted.name).toBe((emitted.payload as any).eventType);
      ledgerEventEnvelopeSchema.parse(emitted.payload);
      return result;
    };

    await run('RegisterDisaster', () => contract.RegisterDisaster(h.ctx, ids.disaster, 'Assam Flood Response', 'AS'));
    await run('RegisterScheme', () => contract.RegisterScheme(h.ctx, ids.scheme, ids.disaster, 'Emergency Cash'));
    await run('CreateFundSource', () => contract.CreateFundSource(h.ctx, ids.source, ids.disaster, 'STATE_GOVERNMENT', 'State Relief Fund', '10000000'));
    await run('AllocateFunds', () => contract.AllocateFunds(h.ctx, ids.allocation, ids.source, ids.scheme, 'AS-KAM', '5000000'));
    const beneficiaryRef = `ben_${'a'.repeat(64)}`;
    const commitment = await run('RegisterBeneficiaryCommitment', () => contract.RegisterBeneficiaryCommitment(h.ctx, beneficiaryRef, 'AS-KAM', ids.scheme));
    expect(commitment).not.toHaveProperty('beneficiaryRef');
    const initiated = await run('InitiateDisbursement', () => contract.InitiateDisbursement(h.ctx, ids.payout, 'RC-2026-ABCD1234', ids.allocation, beneficiaryRef, '2500000', 'idem-key-0001'));
    expect(initiated).not.toHaveProperty('idempotencyKey');
    const settled = await run('FinalizeDisbursement', () => contract.FinalizeDisbursement(h.ctx, ids.payout, 'SETTLED', `sha256:${'b'.repeat(64)}`, ''));
    expect(settled).not.toHaveProperty('bankReference');
    const reversed = await run('ReverseDisbursement', () => contract.ReverseDisbursement(h.ctx, ids.payout, 'OPERATOR_REVERSAL'));
    expect(reversed).not.toHaveProperty('failureReason');
  });

  it('rejects non-canonical paise using a stable error code', async () => {
    const h = harness(); h.next();
    await contract.RegisterDisaster(h.ctx, ids.disaster, 'Assam Flood Response', 'AS');
    await expect(contract.CreateFundSource(h.ctx, ids.source, ids.disaster, 'STATE_GOVERNMENT', 'State Relief Fund', '01')).rejects.toThrow('[LEDGER_INVALID_AMOUNT]');
  });

  it('does not emit an accepted event for a rejected transaction', async () => {
    const h = harness(); h.next();
    await contract.RegisterDisaster(h.ctx, ids.disaster, 'Assam Flood Response', 'AS');
    const before = h.events.length;
    await expect(contract.RegisterDisaster(h.ctx, ids.disaster, 'Assam Flood Response', 'AS')).rejects.toThrow('[LEDGER_DUPLICATE]');
    expect(h.events).toHaveLength(before);
  });
});
