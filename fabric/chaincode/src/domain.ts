export type LedgerActor = 'GOVERNMENT' | 'NGO' | 'AUDITOR';
export type PayoutState = 'PENDING' | 'SETTLED' | 'FAILED' | 'REVERSED';

export interface FundSourceAsset {
  docType: 'fundSource'; id: string; ownerMsp: string; sourceType: string; name: string;
  disasterId: string; amountPaise: number; allocatedPaise: number; createdAt: string;
}
export interface AllocationAsset {
  docType: 'allocation'; id: string; sourceId: string; ownerMsp: string; schemeId: string;
  districtCode: string; amountPaise: number; disbursedPaise: number; reservedPaise: number; createdAt: string;
}
export interface DisbursementAsset {
  docType: 'disbursement'; id: string; publicReference: string; allocationId: string;
  beneficiaryRef: string; amountPaise: number; status: PayoutState; idempotencyKey: string;
  bankReference?: string; failureReason?: string; reversalOf?: string; createdAt: string; updatedAt: string;
}

export function positivePaise(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('amountPaise must be a positive safe integer');
  return value;
}
export function allocate(source: FundSourceAsset, amount: number, actorMsp: string): FundSourceAsset {
  positivePaise(amount);
  if (source.ownerMsp !== actorMsp) throw new Error('Only the owning organization can allocate this source');
  if (source.allocatedPaise + amount > source.amountPaise) throw new Error('Allocation exceeds source balance');
  return { ...source, allocatedPaise: source.allocatedPaise + amount };
}
export function reserve(allocation: AllocationAsset, amount: number, actorMsp: string): AllocationAsset {
  positivePaise(amount);
  if (allocation.ownerMsp !== actorMsp) throw new Error('Only the owning organization can disburse this allocation');
  if (allocation.disbursedPaise + allocation.reservedPaise + amount > allocation.amountPaise) {
    throw new Error('Disbursement exceeds allocation balance');
  }
  return { ...allocation, reservedPaise: allocation.reservedPaise + amount };
}
export function settle(allocation: AllocationAsset, payout: DisbursementAsset, status: 'SETTLED' | 'FAILED', now: string) {
  if (payout.status !== 'PENDING') throw new Error('Only pending disbursements can be finalized');
  if (allocation.reservedPaise < payout.amountPaise) throw new Error('Reserved allocation invariant violated');
  return {
    allocation: {
      ...allocation,
      reservedPaise: allocation.reservedPaise - payout.amountPaise,
      disbursedPaise: allocation.disbursedPaise + (status === 'SETTLED' ? payout.amountPaise : 0)
    },
    payout: { ...payout, status, updatedAt: now } satisfies DisbursementAsset
  };
}
export function reverse(allocation: AllocationAsset, payout: DisbursementAsset, now: string) {
  if (payout.status !== 'SETTLED') throw new Error('Only settled disbursements can be reversed');
  if (allocation.disbursedPaise < payout.amountPaise) throw new Error('Disbursed allocation invariant violated');
  return {
    allocation: { ...allocation, disbursedPaise: allocation.disbursedPaise - payout.amountPaise },
    payout: { ...payout, status: 'REVERSED', updatedAt: now } satisfies DisbursementAsset
  };
}
