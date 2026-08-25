import { z } from 'zod';
import {
  actorMspSchema, districtCodeSchema, ledgerTimestampSchema, ownerMspSchema,
  providerReferenceHashSchema, publicReferenceSchema, reasonCodeSchema, sourceTypeSchema,
  stateCodeSchema, uuidSchema, MAX_LEDGER_PAISE
} from './ledger-assets';

export const ledgerEventNames = [
  'DisasterRegistered', 'SchemeRegistered', 'FundSourceCreated', 'FundsAllocated',
  'BeneficiaryCommitted', 'DisbursementInitiated', 'DisbursementSettled',
  'DisbursementFailed', 'DisbursementReversed'
] as const;
export const ledgerEventNameSchema = z.enum(ledgerEventNames);
export type LedgerEventName = z.infer<typeof ledgerEventNameSchema>;

export const ledgerEventEntityTypes: Record<LedgerEventName, string> = {
  DisasterRegistered: 'disaster',
  SchemeRegistered: 'scheme',
  FundSourceCreated: 'fundSource',
  FundsAllocated: 'allocation',
  BeneficiaryCommitted: 'beneficiaryCommitment',
  DisbursementInitiated: 'disbursement',
  DisbursementSettled: 'disbursement',
  DisbursementFailed: 'disbursement',
  DisbursementReversed: 'disbursement'
};

const amountSchema = z.number().int().positive().max(MAX_LEDGER_PAISE);
const transitionBase = {
  publicReference: publicReferenceSchema, allocationId: uuidSchema, amountPaise: amountSchema,
  ownerMsp: ownerMspSchema
};

export const ledgerEventPayloadSchemas = {
  DisasterRegistered: z.object({ stateCode: stateCodeSchema }).strict(),
  SchemeRegistered: z.object({ disasterId: uuidSchema }).strict(),
  FundSourceCreated: z.object({ disasterId: uuidSchema, sourceType: sourceTypeSchema, amountPaise: amountSchema, ownerMsp: ownerMspSchema }).strict(),
  FundsAllocated: z.object({ sourceId: uuidSchema, schemeId: uuidSchema, districtCode: districtCodeSchema, amountPaise: amountSchema, ownerMsp: ownerMspSchema }).strict(),
  BeneficiaryCommitted: z.object({ districtCode: districtCodeSchema, schemeId: uuidSchema }).strict(),
  DisbursementInitiated: z.object({ ...transitionBase, fromStatus: z.null(), toStatus: z.literal('PENDING') }).strict(),
  DisbursementSettled: z.object({ ...transitionBase, fromStatus: z.literal('PENDING'), toStatus: z.literal('SETTLED'), providerReferenceHash: providerReferenceHashSchema.optional() }).strict(),
  DisbursementFailed: z.object({ ...transitionBase, fromStatus: z.literal('PENDING'), toStatus: z.literal('FAILED'), providerReferenceHash: providerReferenceHashSchema.optional(), reasonCode: reasonCodeSchema }).strict(),
  DisbursementReversed: z.object({ ...transitionBase, fromStatus: z.literal('SETTLED'), toStatus: z.literal('REVERSED'), reasonCode: reasonCodeSchema }).strict()
} as const;

const forbiddenKeys = new Set([
  'beneficiaryref', 'beneficiaryreference', 'idempotencykey', 'bankreference', 'providerreference',
  'name', 'phone', 'aadhaar', 'otp', 'rawprovidererror', 'errormessage', 'secret', 'internalnote', 'internalnotes'
]);

export function findProhibitedLedgerFields(value: unknown, path = 'payload'): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((item, index) => findProhibitedLedgerFields(item, `${path}[${index}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const normalized = key.replace(/[^a-z]/gi, '').toLowerCase();
    const own = forbiddenKeys.has(normalized) ? [`${path}.${key}`] : [];
    return own.concat(findProhibitedLedgerFields(nested, `${path}.${key}`));
  });
}

const envelopeBase = z.object({
  schemaVersion: z.literal(1), eventType: ledgerEventNameSchema, entityType: z.enum(['disaster', 'scheme', 'fundSource', 'allocation', 'beneficiaryCommitment', 'disbursement']),
  entityId: z.string().min(1).max(160), occurredAt: ledgerTimestampSchema,
  transactionId: z.string().min(16).max(160), actorMsp: actorMspSchema, payload: z.unknown()
}).strict();

export function validateLedgerEvent(value: unknown): void {
  const envelope = envelopeBase.parse(value);
  if (envelope.entityType !== ledgerEventEntityTypes[envelope.eventType]) {
    throw new Error(`Invalid entityType for ${envelope.eventType}`);
  }
  const prohibited = findProhibitedLedgerFields(envelope.payload);
  if (prohibited.length) throw new Error(`Prohibited ledger event fields: ${prohibited.join(', ')}`);
  ledgerEventPayloadSchemas[envelope.eventType].parse(envelope.payload);
}

export const ledgerEventEnvelopeSchema = envelopeBase.superRefine((value, context) => {
  if (value.entityType !== ledgerEventEntityTypes[value.eventType]) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid entityType for ${value.eventType}`, path: ['entityType'] });
  }
  const prohibited = findProhibitedLedgerFields(value.payload);
  prohibited.forEach((path) => context.addIssue({ code: z.ZodIssueCode.custom, message: `Prohibited ledger event field: ${path}`, path: ['payload'] }));
  const parsed = ledgerEventPayloadSchemas[value.eventType].safeParse(value.payload);
  if (!parsed.success) parsed.error.issues.forEach((issue) => context.addIssue({ ...issue, path: ['payload', ...issue.path] }));
});

export type LedgerEventEnvelope = z.infer<typeof ledgerEventEnvelopeSchema>;
