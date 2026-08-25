import { z } from 'zod';
import {
  allocationAssetViewSchema, beneficiaryCommitmentAssetViewSchema, beneficiaryReferenceSchema,
  disasterAssetViewSchema, disbursementAssetViewSchema, districtCodeSchema, fundSourceAssetViewSchema,
  idempotencyKeySchema, paiseStringSchema, providerReferenceHashSchema, publicReferenceSchema,
  reasonCodeSchema, schemeAssetViewSchema, sourceTypeSchema, stateCodeSchema,
  terminalPayoutStatusSchema, uuidSchema
} from './ledger-assets';

export const ledgerTransactionNames = [
  'RegisterDisaster', 'RegisterScheme', 'CreateFundSource', 'AllocateFunds',
  'RegisterBeneficiaryCommitment', 'InitiateDisbursement', 'FinalizeDisbursement', 'ReverseDisbursement'
] as const;
export const ledgerTransactionNameSchema = z.enum(ledgerTransactionNames);
export type LedgerTransactionName = z.infer<typeof ledgerTransactionNameSchema>;

const nameSchema = z.string().min(3).max(120);
const optionalProviderHashSchema = z.union([providerReferenceHashSchema, z.literal('')]);
const optionalReasonCodeSchema = z.union([reasonCodeSchema, z.literal('')]);

export const ledgerTransactionSchemas = {
  RegisterDisaster: { arguments: z.tuple([uuidSchema, nameSchema, stateCodeSchema]), result: disasterAssetViewSchema },
  RegisterScheme: { arguments: z.tuple([uuidSchema, uuidSchema, nameSchema]), result: schemeAssetViewSchema },
  CreateFundSource: { arguments: z.tuple([uuidSchema, uuidSchema, sourceTypeSchema, nameSchema, paiseStringSchema]), result: fundSourceAssetViewSchema },
  AllocateFunds: { arguments: z.tuple([uuidSchema, uuidSchema, uuidSchema, districtCodeSchema, paiseStringSchema]), result: allocationAssetViewSchema },
  RegisterBeneficiaryCommitment: { arguments: z.tuple([beneficiaryReferenceSchema, districtCodeSchema, uuidSchema]), result: beneficiaryCommitmentAssetViewSchema },
  InitiateDisbursement: { arguments: z.tuple([uuidSchema, publicReferenceSchema, uuidSchema, beneficiaryReferenceSchema, paiseStringSchema, idempotencyKeySchema]), result: disbursementAssetViewSchema },
  FinalizeDisbursement: { arguments: z.tuple([uuidSchema, terminalPayoutStatusSchema, optionalProviderHashSchema, optionalReasonCodeSchema]), result: disbursementAssetViewSchema },
  ReverseDisbursement: { arguments: z.tuple([uuidSchema, reasonCodeSchema]), result: disbursementAssetViewSchema }
} as const;

export const transactionFixtureSchema = z.object({
  transaction: ledgerTransactionNameSchema,
  arguments: z.array(z.string()),
  result: z.unknown()
}).strict();

export function validateTransactionFixture(value: unknown): void {
  const fixture = transactionFixtureSchema.parse(value);
  const contract = ledgerTransactionSchemas[fixture.transaction];
  contract.arguments.parse(fixture.arguments);
  contract.result.parse(fixture.result);
}
