import { z } from 'zod';

export const LEDGER_SCHEMA_VERSION = 1 as const;
export const MAX_LEDGER_PAISE = 1_000_000_000_000;

export const uuidSchema = z.string().uuid();
export const stateCodeSchema = z.string().regex(/^[A-Z]{2}$/);
export const districtCodeSchema = z.string().regex(/^[A-Z]{2}-[A-Z0-9]{2,9}$/).max(12);
export const ownerMspSchema = z.enum(['GovernmentMSP', 'NgoMSP']);
export const actorMspSchema = z.enum(['GovernmentMSP', 'NgoMSP', 'AuditorMSP']);
export const sourceTypeSchema = z.enum(['CENTRAL_GOVERNMENT', 'STATE_GOVERNMENT', 'NGO']);
export const terminalPayoutStatusSchema = z.enum(['SETTLED', 'FAILED']);
export const ledgerPayoutStatusSchema = z.enum(['PENDING', 'SETTLED', 'FAILED', 'REVERSED']);
export const publicReferenceSchema = z.string().regex(/^RC-\d{4}-[A-Z0-9]{8}$/);
export const beneficiaryReferenceSchema = z.string().regex(/^ben_[a-f0-9]{64}$/);
export const providerReferenceHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
export const reasonCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/);
export const idempotencyKeySchema = z.string().min(8).max(100);
export const ledgerTimestampSchema = z.string().datetime({ offset: true });

export const paiseStringSchema = z.string().superRefine((value, context) => {
  if (!/^[1-9]\d*$/.test(value)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'amountPaise must be a canonical positive decimal string' });
    return;
  }
  if (BigInt(value) > BigInt(MAX_LEDGER_PAISE)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: `amountPaise must not exceed ${MAX_LEDGER_PAISE}` });
  }
});

export function parsePaiseString(value: string): number {
  return Number(paiseStringSchema.parse(value));
}

export const disasterAssetViewSchema = z.object({
  docType: z.literal('disaster'), id: uuidSchema, stateCode: stateCodeSchema, createdAt: ledgerTimestampSchema
}).strict();

export const schemeAssetViewSchema = z.object({
  docType: z.literal('scheme'), id: uuidSchema, disasterId: uuidSchema, createdAt: ledgerTimestampSchema
}).strict();

export const fundSourceAssetViewSchema = z.object({
  docType: z.literal('fundSource'), id: uuidSchema, ownerMsp: ownerMspSchema,
  sourceType: sourceTypeSchema, disasterId: uuidSchema, amountPaise: z.number().int().positive().max(MAX_LEDGER_PAISE),
  allocatedPaise: z.number().int().nonnegative().max(MAX_LEDGER_PAISE), createdAt: ledgerTimestampSchema
}).strict();

export const allocationAssetViewSchema = z.object({
  docType: z.literal('allocation'), id: uuidSchema, sourceId: uuidSchema, ownerMsp: ownerMspSchema,
  schemeId: uuidSchema, districtCode: districtCodeSchema, amountPaise: z.number().int().positive().max(MAX_LEDGER_PAISE),
  disbursedPaise: z.number().int().nonnegative().max(MAX_LEDGER_PAISE),
  reservedPaise: z.number().int().nonnegative().max(MAX_LEDGER_PAISE), createdAt: ledgerTimestampSchema
}).strict();

export const beneficiaryCommitmentAssetViewSchema = z.object({
  docType: z.literal('beneficiaryCommitment'), commitmentId: z.string().min(16).max(160),
  districtCode: districtCodeSchema, schemeId: uuidSchema, createdAt: ledgerTimestampSchema
}).strict();

export const disbursementAssetViewSchema = z.object({
  docType: z.literal('disbursement'), id: uuidSchema, publicReference: publicReferenceSchema,
  allocationId: uuidSchema, amountPaise: z.number().int().positive().max(MAX_LEDGER_PAISE),
  status: ledgerPayoutStatusSchema, providerReferenceHash: providerReferenceHashSchema.optional(),
  reasonCode: reasonCodeSchema.optional(), createdAt: ledgerTimestampSchema, updatedAt: ledgerTimestampSchema
}).strict();

export type DisasterAssetView = z.infer<typeof disasterAssetViewSchema>;
export type SchemeAssetView = z.infer<typeof schemeAssetViewSchema>;
export type FundSourceAssetView = z.infer<typeof fundSourceAssetViewSchema>;
export type AllocationAssetView = z.infer<typeof allocationAssetViewSchema>;
export type BeneficiaryCommitmentAssetView = z.infer<typeof beneficiaryCommitmentAssetViewSchema>;
export type DisbursementAssetView = z.infer<typeof disbursementAssetViewSchema>;
