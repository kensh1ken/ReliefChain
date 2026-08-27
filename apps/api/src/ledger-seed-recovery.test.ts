import { describe, expect, it } from 'vitest';
import { assertMatchingSeedAsset, ledgerErrorHasCode } from './ledger';

describe('ledger seed recovery', () => {
  it('finds stable ledger codes nested in Fabric endorsement details', () => {
    const error = {
      message: 'failed to endorse transaction',
      details: [{ address: 'peer0.government.example.com:7051', message: 'chaincode response 500, [LEDGER_DUPLICATE] Disaster already exists' }]
    };
    expect(ledgerErrorHasCode(error, 'LEDGER_DUPLICATE')).toBe(true);
    expect(ledgerErrorHasCode(error, 'LEDGER_NOT_FOUND')).toBe(false);
  });

  it('accepts an existing deterministic seed asset with matching public fields', () => {
    expect(() => assertMatchingSeedAsset(
      'RegisterDisaster',
      ['10000000-0000-4000-8000-000000000001', 'Assam Flood Response 2026', 'AS'],
      'GovernmentMSP',
      { docType: 'disaster', id: '10000000-0000-4000-8000-000000000001', stateCode: 'AS', createdAt: '2026-08-26T00:00:00.000Z' }
    )).not.toThrow();
  });

  it('accepts an existing seed disbursement that has already reached a final status', () => {
    expect(() => assertMatchingSeedAsset(
      'InitiateDisbursement',
      ['80000000-0000-4000-8000-000000000001', 'RC-2026-SEED0001', '40000000-0000-4000-8000-000000000001', 'ben_hash', '2500000', 'assam-demo-payment-1'],
      'GovernmentMSP',
      { docType: 'disbursement', id: '80000000-0000-4000-8000-000000000001', publicReference: 'RC-2026-SEED0001', allocationId: '40000000-0000-4000-8000-000000000001', amountPaise: 2_500_000, status: 'SETTLED' }
    )).not.toThrow();
  });

  it('rejects a duplicate whose ledger data conflicts with the seed definition', () => {
    expect(() => assertMatchingSeedAsset(
      'CreateFundSource',
      ['30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'STATE_GOVERNMENT', 'Fund', '1500000000'],
      'GovernmentMSP',
      { docType: 'fundSource', id: '30000000-0000-4000-8000-000000000001', disasterId: '10000000-0000-4000-8000-000000000001', sourceType: 'STATE_GOVERNMENT', amountPaise: 1, ownerMsp: 'GovernmentMSP' }
    )).toThrow(/SEED_LEDGER_CONFLICT.*amountPaise/);
  });

  it('does not enable duplicate recovery for non-seed transitions', () => {
    expect(() => assertMatchingSeedAsset('ReverseDisbursement', ['id', 'REASON'], 'GovernmentMSP', {}))
      .toThrow(/does not support duplicate recovery/);
  });
});
