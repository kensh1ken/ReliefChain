import { describe, expect, it } from 'vitest';
import { AllocationAsset, DisbursementAsset, FundSourceAsset, allocate, reserve, settle } from './domain';

const source: FundSourceAsset = { docType: 'fundSource', id: 's', ownerMsp: 'GovernmentMSP', sourceType: 'STATE_GOVERNMENT', name: 'Fund', disasterId: 'd', amountPaise: 1000, allocatedPaise: 0, createdAt: '' };
const allocation: AllocationAsset = { docType: 'allocation', id: 'a', sourceId: 's', ownerMsp: 'GovernmentMSP', schemeId: 'x', districtCode: 'AS-KAM', amountPaise: 600, disbursedPaise: 0, reservedPaise: 0, createdAt: '' };
describe('ledger invariants', () => {
  it('prevents over allocation and wrong owners', () => {
    expect(() => allocate(source, 1001, 'GovernmentMSP')).toThrow('exceeds');
    expect(() => allocate(source, 1, 'NgoMSP')).toThrow('owning');
  });
  it('reserves then settles without inflating balance', () => {
    const reserved = reserve(allocation, 200, 'GovernmentMSP');
    const payout: DisbursementAsset = { docType: 'disbursement', id: 'p', publicReference: 'R', allocationId: 'a', beneficiaryRef: 'b', amountPaise: 200, status: 'PENDING', idempotencyKey: 'idem', createdAt: '', updatedAt: '' };
    const result = settle(reserved, payout, 'SETTLED', 'now');
    expect(result.allocation).toMatchObject({ reservedPaise: 0, disbursedPaise: 200 });
    expect(() => settle(result.allocation, result.payout, 'SETTLED', 'later')).toThrow('pending');
  });
});
