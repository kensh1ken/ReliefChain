import { z } from 'zod';
import { ledgerTimestampSchema } from './ledger-assets';

export const ledgerReceiptSchema = z.object({
  transactionId: z.string().min(16).max(160),
  blockNumber: z.number().int().nonnegative().nullable(),
  committedAt: ledgerTimestampSchema,
  status: z.literal('VALID')
}).strict();

export type FrozenLedgerReceipt = z.infer<typeof ledgerReceiptSchema>;
