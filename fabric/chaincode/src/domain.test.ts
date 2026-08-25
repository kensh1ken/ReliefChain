import { describe, expect, it } from 'vitest';
import {
  AllocationAsset, DisbursementAsset, FundSourceAsset, PayoutBatchAsset, PayoutBatchState,
  allocate, finalizeDisbursement, markDisbursementUnknown, payoutBatchTransitions,
  reserve, reverse, reverseDisbursement, settle, transitionPayoutBatch
} from './domain';

const providerHash = `sha256:${'a'.repeat(64)}`;
const source: FundSourceAsset = {
  docType: 'fundSource', id: 's', ownerMsp: 'GovernmentMSP', sourceType: 'STATE_GOVERNMENT',
  name: 'Fund', disasterId: 'd', amountPaise: 1000, allocatedPaise: 0, createdAt: 'created'
};
const allocation: AllocationAsset = {
  docType: 'allocation', id: 'a', sourceId: 's', ownerMsp: 'GovernmentMSP', schemeId: 'x',
  districtCode: 'AS-KAM', amountPaise: 600, disbursedPaise: 0, reservedPaise: 200, createdAt: 'created'
};
const pendingPayout: DisbursementAsset = {
  docType: 'disbursement', id: 'p', publicReference: 'R', allocationId: 'a', beneficiaryRef: 'b',
  amountPaise: 200, status: 'PENDING', idempotencyKey: 'idem', batchId: 'batch-1',
  createdAt: 'created', updatedAt: 'created'
};

function metadata(index: number, extra: Partial<{ providerReferenceHash: string; reasonCode: string }> = {}) {
  return { transitionId: `transition-${index}`, actorMsp: 'GovernmentMSP', occurredAt: `time-${index}`, ...extra };
}

function settledPayout(): DisbursementAsset {
  return { ...pendingPayout, status: 'SETTLED', providerReferenceHash: providerHash };
}

describe('existing ledger invariants and v1 wrappers', () => {
  it('prevents over-allocation and wrong owners without mutating the source', () => {
    const snapshot = structuredClone(source);
    expect(() => allocate(source, 1001, 'GovernmentMSP')).toThrow('exceeds');
    expect(() => allocate(source, 1, 'NgoMSP')).toThrow('owning');
    expect(source).toEqual(snapshot);
  });

  it('reserves funds immutably', () => {
    const available = { ...allocation, reservedPaise: 0 };
    const result = reserve(available, 200, 'GovernmentMSP');
    expect(result).toMatchObject({ reservedPaise: 200 });
    expect(available.reservedPaise).toBe(0);
  });

  it('keeps settle compatible with the existing transaction handler', () => {
    const result = settle(allocation, pendingPayout, 'SETTLED', 'now');
    expect(result.allocation).toMatchObject({ reservedPaise: 0, disbursedPaise: 200 });
    expect(result.payout).toMatchObject({ status: 'SETTLED', updatedAt: 'now' });
    expect(() => settle(result.allocation, result.payout, 'SETTLED', 'later')).toThrow('pending');
  });

  it('keeps reverse compatible with the existing transaction handler', () => {
    const paid = { ...allocation, reservedPaise: 0, disbursedPaise: 200 };
    const result = reverse(paid, settledPayout(), 'reversed-at');
    expect(result.allocation.disbursedPaise).toBe(0);
    expect(result.payout).toMatchObject({ status: 'REVERSED', updatedAt: 'reversed-at' });
  });
});

describe('UNKNOWN and terminal disbursement transitions', () => {
  it('marks PENDING as UNKNOWN without accepting or changing an allocation', () => {
    const original = structuredClone(pendingPayout);
    const result = markDisbursementUnknown(pendingPayout, metadata(1, {
      providerReferenceHash: providerHash, reasonCode: 'PROVIDER_TIMEOUT'
    }));
    expect(result.payout).toMatchObject({ status: 'UNKNOWN', providerReferenceHash: providerHash, reasonCode: 'PROVIDER_TIMEOUT' });
    expect(result.transition).toMatchObject({ fromStatus: 'PENDING', toStatus: 'UNKNOWN', providerReferenceHash: providerHash });
    expect(pendingPayout).toEqual(original);
  });

  it.each([undefined, '', 'BANK-RAW-123', `sha256:${'A'.repeat(64)}`])
    ('rejects missing or unsafe UNKNOWN provider hash %j', (unsafeHash) => {
      expect(() => markDisbursementUnknown(pendingPayout, metadata(2, {
        providerReferenceHash: unsafeHash as string
      }))).toThrow(/providerReferenceHash/);
    });

  it('settles directly from PENDING and releases the reservation once', () => {
    const result = finalizeDisbursement(allocation, pendingPayout, 'SETTLED', metadata(3, { providerReferenceHash: providerHash }));
    expect(result.allocation).toMatchObject({ reservedPaise: 0, disbursedPaise: 200 });
    expect(result.payout).toMatchObject({ status: 'SETTLED', providerReferenceHash: providerHash });
    expect(result.transition).toMatchObject({ fromStatus: 'PENDING', toStatus: 'SETTLED' });
    expect(() => finalizeDisbursement(result.allocation, result.payout, 'SETTLED', metadata(4))).toThrow('Invalid');
  });

  it('fails directly from PENDING without increasing disbursed funds', () => {
    const result = finalizeDisbursement(allocation, pendingPayout, 'FAILED', metadata(5, {
      providerReferenceHash: providerHash, reasonCode: 'BANK_REJECTED'
    }));
    expect(result.allocation).toMatchObject({ reservedPaise: 0, disbursedPaise: 0 });
    expect(result.payout).toMatchObject({ status: 'FAILED', reasonCode: 'BANK_REJECTED' });
    expect(result.transition).toMatchObject({ fromStatus: 'PENDING', toStatus: 'FAILED' });
  });

  it.each(['SETTLED', 'FAILED'] as const)('reconciles UNKNOWN to %s and releases its retained reservation', (status) => {
    const unknown = markDisbursementUnknown(pendingPayout, metadata(6, { providerReferenceHash: providerHash })).payout;
    const result = finalizeDisbursement(allocation, unknown, status, metadata(7, {
      ...(status === 'FAILED' ? { reasonCode: 'BANK_REJECTED' } : {})
    }));
    expect(result.allocation.reservedPaise).toBe(0);
    expect(result.allocation.disbursedPaise).toBe(status === 'SETTLED' ? 200 : 0);
    expect(result.transition).toMatchObject({ fromStatus: 'UNKNOWN', toStatus: status, providerReferenceHash: providerHash });
  });

  it('requires a stable reason code for FAILED', () => {
    expect(() => finalizeDisbursement(allocation, pendingPayout, 'FAILED', metadata(8))).toThrow('reasonCode');
    expect(() => finalizeDisbursement(allocation, pendingPayout, 'FAILED', metadata(9, { reasonCode: 'free text' }))).toThrow('reasonCode');
  });

  it('rejects terminal, duplicate, mismatched-allocation, and insufficient-reservation finalization', () => {
    expect(() => markDisbursementUnknown({ ...pendingPayout, status: 'FAILED' }, metadata(10, { providerReferenceHash: providerHash }))).toThrow('Invalid');
    expect(() => finalizeDisbursement(allocation, { ...pendingPayout, status: 'REVERSED' }, 'FAILED', metadata(11, { reasonCode: 'BANK_REJECTED' }))).toThrow('Invalid');
    expect(() => finalizeDisbursement({ ...allocation, id: 'other' }, pendingPayout, 'SETTLED', metadata(12))).toThrow('does not belong');
    expect(() => finalizeDisbursement({ ...allocation, reservedPaise: 199 }, pendingPayout, 'SETTLED', metadata(13))).toThrow('Reserved');
  });

  it('never writes deprecated privacy or reversal fields', () => {
    const unknown = markDisbursementUnknown(pendingPayout, metadata(14, { providerReferenceHash: providerHash })).payout;
    const failed = finalizeDisbursement(allocation, unknown, 'FAILED', metadata(15, { reasonCode: 'BANK_REJECTED' })).payout;
    for (const payout of [unknown, failed]) {
      expect(payout).not.toHaveProperty('bankReference');
      expect(payout).not.toHaveProperty('failureReason');
      expect(payout).not.toHaveProperty('reversalOf');
    }
  });
});

describe('linked reversal domain model', () => {
  const paidAllocation = { ...allocation, reservedPaise: 0, disbursedPaise: 200 };
  const reversalMetadata = {
    ...metadata(20), reversalId: 'reversal-1', approvedByMsp: 'OversightMSP', reasonCode: 'DUPLICATE_SETTLEMENT'
  };

  it('creates a linked reversal, restores the balance, and records approval', () => {
    const allocationSnapshot = structuredClone(paidAllocation);
    const payout = settledPayout();
    const payoutSnapshot = structuredClone(payout);
    const result = reverseDisbursement(paidAllocation, payout, reversalMetadata);

    expect(result.allocation.disbursedPaise).toBe(0);
    expect(result.payout.status).toBe('REVERSED');
    expect(result.payout).not.toHaveProperty('failureReason');
    expect(result.payout).not.toHaveProperty('reversalOf');
    expect(result.reversal).toEqual({
      docType: 'reversal', reversalId: 'reversal-1', reversalOf: 'p', ownerMsp: 'GovernmentMSP',
      amountPaise: 200, reasonCode: 'DUPLICATE_SETTLEMENT', approvedByMsp: 'OversightMSP', createdAt: 'time-20'
    });
    expect(result.transition).toMatchObject({ fromStatus: 'SETTLED', toStatus: 'REVERSED', reasonCode: 'DUPLICATE_SETTLEMENT' });
    expect(paidAllocation).toEqual(allocationSnapshot);
    expect(payout).toEqual(payoutSnapshot);
  });

  it('rejects duplicate/invalid reversals and missing metadata', () => {
    expect(() => reverseDisbursement(paidAllocation, { ...settledPayout(), status: 'REVERSED' }, reversalMetadata)).toThrow('Invalid');
    expect(() => reverseDisbursement({ ...paidAllocation, disbursedPaise: 199 }, settledPayout(), reversalMetadata)).toThrow('Disbursed');
    expect(() => reverseDisbursement(paidAllocation, settledPayout(), { ...reversalMetadata, approvedByMsp: '' })).toThrow('approvedByMsp');
    expect(() => reverseDisbursement(paidAllocation, settledPayout(), { ...reversalMetadata, reversalId: '' })).toThrow('reversalId');
    expect(() => reverseDisbursement(paidAllocation, settledPayout(), { ...reversalMetadata, reasonCode: 'free text' })).toThrow('reasonCode');
  });
});

describe('payout batch transitions', () => {
  const states: PayoutBatchState[] = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SUBMITTED', 'COMPLETED', 'FAILED', 'CANCELLED'];
  const batch: PayoutBatchAsset = {
    docType: 'payoutBatch', id: 'batch-1', ownerMsp: 'GovernmentMSP', status: 'DRAFT',
    totalAmountPaise: 400, itemCount: 2, createdAt: 'created', updatedAt: 'created'
  };

  it('accepts every declared transition and keeps the input immutable', () => {
    for (const fromStatus of states) {
      for (const toStatus of payoutBatchTransitions[fromStatus]) {
        const input = { ...batch, status: fromStatus };
        const result = transitionPayoutBatch(input, toStatus, `${fromStatus}-${toStatus}`);
        expect(result).toMatchObject({ status: toStatus, updatedAt: `${fromStatus}-${toStatus}` });
        expect(input).toMatchObject({ status: fromStatus, updatedAt: 'created' });
      }
    }
  });

  it('rejects every transition not declared by the table, including duplicates and terminal exits', () => {
    for (const fromStatus of states) {
      for (const toStatus of states) {
        if (!(payoutBatchTransitions[fromStatus] as readonly PayoutBatchState[]).includes(toStatus)) {
          expect(() => transitionPayoutBatch({ ...batch, status: fromStatus }, toStatus, 'next')).toThrow('Invalid');
        }
      }
    }
  });

  it('rejects invalid batch totals, counts, and timestamps', () => {
    expect(() => transitionPayoutBatch({ ...batch, totalAmountPaise: -1 }, 'PENDING_APPROVAL', 'next')).toThrow('total');
    expect(() => transitionPayoutBatch({ ...batch, itemCount: 1.5 }, 'PENDING_APPROVAL', 'next')).toThrow('count');
    expect(() => transitionPayoutBatch(batch, 'PENDING_APPROVAL', '')).toThrow('occurredAt');
  });
});
