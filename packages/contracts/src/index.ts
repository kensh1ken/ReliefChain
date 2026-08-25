import { z } from 'zod';
export * from './privacy';
export * from './ledger-assets';
export * from './ledger-errors';
export * from './ledger-events';
export * from './ledger-receipts';
export * from './ledger-transactions';

export const actorRoles = ['GOVERNMENT', 'NGO', 'AUDITOR'] as const;
export type ActorRole = (typeof actorRoles)[number];
export const sourceTypes = ['CENTRAL_GOVERNMENT', 'STATE_GOVERNMENT', 'NGO'] as const;
export type SourceType = (typeof sourceTypes)[number];
export const payoutStatuses = ['PENDING', 'SETTLED', 'FAILED', 'UNKNOWN', 'REVERSED'] as const;
export type PayoutStatus = (typeof payoutStatuses)[number];

export const moneySchema = z.number().int().positive().max(10_000_000_000_00);
export const fundSourceSchema = z.object({
  name: z.string().min(3).max(120),
  sourceType: z.enum(sourceTypes),
  amountPaise: moneySchema,
  disasterId: z.string().uuid()
});
export const allocationSchema = z.object({
  sourceId: z.string().uuid(),
  schemeId: z.string().uuid(),
  districtCode: z.string().min(2).max(12),
  amountPaise: moneySchema
});
export const beneficiarySchema = z.object({
  aadhaar: z.string().regex(/^\d{12}$/),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+91\d{10}$/),
  districtCode: z.string().min(2).max(12),
  schemeId: z.string().uuid()
});
export const disbursementSchema = z.object({
  allocationId: z.string().uuid(),
  beneficiaryId: z.string().uuid(),
  amountPaise: moneySchema,
  idempotencyKey: z.string().min(8).max(100),
  simulatedOutcome: z.enum(['SETTLED', 'FAILED', 'UNKNOWN']).default('SETTLED')
});

export interface LedgerProof {
  transactionId: string;
  blockNumber: number | null;
  committedAt: string;
  status: 'VALID' | 'PENDING';
}
export interface DashboardSummary {
  receivedPaise: number;
  allocatedPaise: number;
  pendingPaise: number;
  disbursedPaise: number;
  failedPaise: number;
  remainingPaise: number;
  source: 'FABRIC_INDEX';
  lastIndexedAt: string | null;
}
export interface PublicDisbursement {
  publicReference: string;
  districtCode: string;
  schemeName: string;
  sourceType: SourceType;
  amountPaise: number;
  status: PayoutStatus;
  proof: LedgerProof;
}

export const translations = {
  en: {
    appName: 'ReliefChain', status: 'Disbursement status', promised: 'Promised aid',
    settled: 'Payment completed', pending: 'Payment is being processed', failed: 'Payment needs attention',
    otpHelp: 'Enter the 6-digit code sent to your registered phone.'
  },
  hi: {
    appName: 'रिलीफचेन', status: 'भुगतान की स्थिति', promised: 'स्वीकृत सहायता',
    settled: 'भुगतान पूरा हुआ', pending: 'भुगतान प्रक्रिया में है', failed: 'भुगतान पर ध्यान आवश्यक है',
    otpHelp: 'पंजीकृत फ़ोन पर भेजा गया 6 अंकों का कोड दर्ज करें।'
  }
} as const;
