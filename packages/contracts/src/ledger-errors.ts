import { z } from 'zod';

export const ledgerErrorCodes = [
  'LEDGER_INVALID_ARGUMENT',
  'LEDGER_INVALID_AMOUNT',
  'LEDGER_NOT_FOUND',
  'LEDGER_DUPLICATE',
  'LEDGER_UNAUTHORIZED',
  'LEDGER_OWNERSHIP_MISMATCH',
  'LEDGER_INSUFFICIENT_BALANCE',
  'LEDGER_INVALID_TRANSITION',
  'LEDGER_PRIVACY_VIOLATION'
] as const;

export const ledgerErrorCodeSchema = z.enum(ledgerErrorCodes);
export type LedgerErrorCode = z.infer<typeof ledgerErrorCodeSchema>;

export const ledgerErrorSchema = z.object({
  code: ledgerErrorCodeSchema,
  message: z.string().min(1)
}).strict();

export function formatLedgerError(code: LedgerErrorCode, message: string): string {
  return `[${code}] ${message}`;
}

export function parseLedgerError(value: string): { code: LedgerErrorCode; message: string } | null {
  const match = /^\[([A-Z_]+)]\s+(.+)$/.exec(value);
  if (!match) return null;
  const code = ledgerErrorCodeSchema.safeParse(match[1]);
  return code.success ? { code: code.data, message: match[2] } : null;
}
