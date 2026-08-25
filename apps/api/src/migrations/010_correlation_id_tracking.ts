export const migration = {
  id: '010_correlation_id_tracking',
  up: `
-- Add correlation_id to ledger_events for traceability
ALTER TABLE ledger_events ADD COLUMN IF NOT EXISTS correlation_id text;

-- Add correlation_id to payout_attempts for traceability
ALTER TABLE payout_attempts ADD COLUMN IF NOT EXISTS correlation_id text;

-- Add indexes for correlation_id lookups
CREATE INDEX IF NOT EXISTS idx_ledger_events_correlation_id ON ledger_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_payout_attempts_correlation_id ON payout_attempts(correlation_id);

-- Add correlation_id to ledger receipts in proof column (stored as JSON)
-- No schema change needed as proof is already JSON
`
} as const;
