export type LedgerActor = 'GOVERNMENT' | 'NGO' | 'AUDITOR';
export type PayoutState = 'PENDING' | 'SETTLED' | 'FAILED' | 'UNKNOWN' | 'REVERSED';
export type PayoutBatchState = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SUBMITTED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export const payoutTransitions = {
  PENDING: ['SETTLED', 'FAILED', 'UNKNOWN'],
  SETTLED: ['REVERSED'],
  FAILED: [],
  UNKNOWN: ['SETTLED', 'FAILED'],
  REVERSED: []
} as const satisfies Record<PayoutState, readonly PayoutState[]>;

export const payoutBatchTransitions = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: []
} as const satisfies Record<PayoutBatchState, readonly PayoutBatchState[]>;

export interface FundSourceAsset {
  docType: 'fundSource'; id: string; ownerMsp: string; sourceType: string; name: string;
  disasterId: string; amountPaise: number; allocatedPaise: number; createdAt: string;
}

export interface AllocationAsset {
  docType: 'allocation'; id: string; sourceId: string; ownerMsp: string; schemeId: string;
  districtCode: string; amountPaise: number; disbursedPaise: number; reservedPaise: number; createdAt: string;
}

export interface PayoutBatchAsset {
  docType: 'payoutBatch'; id: string; ownerMsp: string; status: PayoutBatchState;
  totalAmountPaise: number; itemCount: number; createdAt: string; updatedAt: string;
}

export interface DisbursementAsset {
  docType: 'disbursement'; id: string; publicReference: string; allocationId: string;
  beneficiaryRef: string; amountPaise: number; status: PayoutState; idempotencyKey: string;
  batchId?: string; providerReferenceHash?: string; reasonCode?: string;
  /** @deprecated V1 runtime compatibility only. New domain functions never write this field. */
  bankReference?: string;
  /** @deprecated V1 runtime compatibility only. New domain functions never write this field. */
  failureReason?: string;
  /** @deprecated V1 runtime compatibility only. Use ReversalAsset.reversalOf. */
  reversalOf?: string;
  createdAt: string; updatedAt: string;
}

export interface DisbursementStatusTransition {
  docType: 'disbursementStatusTransition'; transitionId: string; disbursementId: string;
  fromStatus: PayoutState; toStatus: PayoutState; actorMsp: string; occurredAt: string;
  reasonCode?: string; providerReferenceHash?: string;
}

export interface ReversalAsset {
  docType: 'reversal'; reversalId: string; reversalOf: string; ownerMsp: string;
  amountPaise: number; reasonCode: string; approvedByMsp: string; createdAt: string;
}

export interface TransitionMetadata {
  transitionId: string; actorMsp: string; occurredAt: string;
  providerReferenceHash?: string; reasonCode?: string;
}

export interface ReversalMetadata extends TransitionMetadata {
  reversalId: string; approvedByMsp: string; reasonCode: string;
}

const providerReferenceHashPattern = /^sha256:[a-f0-9]{64}$/;
const reasonCodePattern = /^[A-Z][A-Z0-9_]{0,63}$/;

function required(value: string, field: string): string {
  if (!value?.trim()) throw new Error(`${field} is required`);
  return value;
}

function providerReferenceHash(value: string): string {
  if (!providerReferenceHashPattern.test(value)) throw new Error('providerReferenceHash must be a privacy-safe SHA-256 hash');
  return value;
}

function reasonCode(value: string): string {
  if (!reasonCodePattern.test(value)) throw new Error('reasonCode must be a stable uppercase code');
  return value;
}

function transitionMetadata(metadata: TransitionMetadata): TransitionMetadata {
  required(metadata.transitionId, 'transitionId');
  required(metadata.actorMsp, 'actorMsp');
  required(metadata.occurredAt, 'occurredAt');
  if (metadata.providerReferenceHash) providerReferenceHash(metadata.providerReferenceHash);
  if (metadata.reasonCode) reasonCode(metadata.reasonCode);
  return metadata;
}

function assertAllocationMatches(allocation: AllocationAsset, payout: DisbursementAsset): void {
  if (allocation.id !== payout.allocationId) throw new Error('Allocation does not belong to this disbursement');
}

function assertPayoutTransition(fromStatus: PayoutState, toStatus: PayoutState): void {
  if (!(payoutTransitions[fromStatus] as readonly PayoutState[]).includes(toStatus)) {
    throw new Error(`Invalid disbursement transition ${fromStatus} -> ${toStatus}`);
  }
}

function makeTransition(payout: DisbursementAsset, toStatus: PayoutState, metadata: TransitionMetadata): DisbursementStatusTransition {
  transitionMetadata(metadata);
  assertPayoutTransition(payout.status, toStatus);
  return {
    docType: 'disbursementStatusTransition', transitionId: metadata.transitionId,
    disbursementId: payout.id, fromStatus: payout.status, toStatus,
    actorMsp: metadata.actorMsp, occurredAt: metadata.occurredAt,
    ...(metadata.reasonCode ? { reasonCode: metadata.reasonCode } : {}),
    ...(metadata.providerReferenceHash ? { providerReferenceHash: metadata.providerReferenceHash } : {})
  };
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

export function markDisbursementUnknown(payout: DisbursementAsset, metadata: TransitionMetadata) {
  const hash = providerReferenceHash(required(metadata.providerReferenceHash ?? '', 'providerReferenceHash'));
  const normalized = { ...transitionMetadata(metadata), providerReferenceHash: hash };
  const transition = makeTransition(payout, 'UNKNOWN', normalized);
  const { reasonCode: _previousReasonCode, ...withoutReasonCode } = payout;
  const updated: DisbursementAsset = {
    ...withoutReasonCode, status: 'UNKNOWN', providerReferenceHash: hash, updatedAt: normalized.occurredAt,
    ...(normalized.reasonCode ? { reasonCode: normalized.reasonCode } : {})
  };
  return { payout: updated, transition };
}

export function finalizeDisbursement(
  allocation: AllocationAsset,
  payout: DisbursementAsset,
  status: 'SETTLED' | 'FAILED',
  metadata: TransitionMetadata
) {
  assertAllocationMatches(allocation, payout);
  const normalized = transitionMetadata(metadata);
  if (status === 'FAILED') reasonCode(required(normalized.reasonCode ?? '', 'reasonCode'));
  const hash = normalized.providerReferenceHash ?? payout.providerReferenceHash;
  if (hash) providerReferenceHash(hash);
  const transition = makeTransition(payout, status, { ...normalized, ...(hash ? { providerReferenceHash: hash } : {}) });
  if (allocation.reservedPaise < payout.amountPaise) throw new Error('Reserved allocation invariant violated');

  const { reasonCode: _previousReasonCode, ...withoutReasonCode } = payout;
  const updatedPayout: DisbursementAsset = {
    ...withoutReasonCode, status, updatedAt: normalized.occurredAt,
    ...(hash ? { providerReferenceHash: hash } : {}),
    ...(status === 'FAILED' ? { reasonCode: normalized.reasonCode } : {})
  };
  return {
    allocation: {
      ...allocation,
      reservedPaise: allocation.reservedPaise - payout.amountPaise,
      disbursedPaise: allocation.disbursedPaise + (status === 'SETTLED' ? payout.amountPaise : 0)
    },
    payout: updatedPayout,
    transition
  };
}

export function reverseDisbursement(allocation: AllocationAsset, payout: DisbursementAsset, metadata: ReversalMetadata) {
  assertAllocationMatches(allocation, payout);
  required(metadata.reversalId, 'reversalId');
  required(metadata.approvedByMsp, 'approvedByMsp');
  reasonCode(metadata.reasonCode);
  const normalized = transitionMetadata(metadata);
  const transition = makeTransition(payout, 'REVERSED', normalized);
  if (allocation.disbursedPaise < payout.amountPaise) throw new Error('Disbursed allocation invariant violated');

  const { reasonCode: _previousReasonCode, ...withoutReasonCode } = payout;
  const updatedPayout: DisbursementAsset = { ...withoutReasonCode, status: 'REVERSED', updatedAt: normalized.occurredAt };
  const reversal: ReversalAsset = {
    docType: 'reversal', reversalId: metadata.reversalId, reversalOf: payout.id,
    ownerMsp: allocation.ownerMsp, amountPaise: payout.amountPaise,
    reasonCode: metadata.reasonCode, approvedByMsp: metadata.approvedByMsp,
    createdAt: normalized.occurredAt
  };
  return {
    allocation: { ...allocation, disbursedPaise: allocation.disbursedPaise - payout.amountPaise },
    payout: updatedPayout,
    reversal,
    transition
  };
}

export function transitionPayoutBatch(batch: PayoutBatchAsset, nextStatus: PayoutBatchState, occurredAt: string): PayoutBatchAsset {
  required(occurredAt, 'occurredAt');
  if (!Number.isSafeInteger(batch.totalAmountPaise) || batch.totalAmountPaise < 0) throw new Error('Batch total must be a non-negative safe integer');
  if (!Number.isSafeInteger(batch.itemCount) || batch.itemCount < 0) throw new Error('Batch item count must be a non-negative safe integer');
  if (!(payoutBatchTransitions[batch.status] as readonly PayoutBatchState[]).includes(nextStatus)) {
    throw new Error(`Invalid payout batch transition ${batch.status} -> ${nextStatus}`);
  }
  return { ...batch, status: nextStatus, updatedAt: occurredAt };
}

/** @deprecated V1 transaction-handler compatibility. Use finalizeDisbursement for v2 domain flows. */
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

/** @deprecated V1 transaction-handler compatibility. Use reverseDisbursement for v2 domain flows. */
export function reverse(allocation: AllocationAsset, payout: DisbursementAsset, now: string) {
  if (payout.status !== 'SETTLED') throw new Error('Only settled disbursements can be reversed');
  if (allocation.disbursedPaise < payout.amountPaise) throw new Error('Disbursed allocation invariant violated');
  return {
    allocation: { ...allocation, disbursedPaise: allocation.disbursedPaise - payout.amountPaise },
    payout: { ...payout, status: 'REVERSED', updatedAt: now } satisfies DisbursementAsset
  };
}
