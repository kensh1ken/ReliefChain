export const migration = {
  id: '009_indexer_enhancements',
  up: `
-- Add indexer metadata fields to checkpoint table
ALTER TABLE indexer_checkpoint ADD COLUMN IF NOT EXISTS indexer_status text DEFAULT 'active';
ALTER TABLE indexer_checkpoint ADD COLUMN IF NOT EXISTS error_count int NOT NULL DEFAULT 0;
ALTER TABLE indexer_checkpoint ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE indexer_checkpoint ADD COLUMN IF NOT EXISTS sync_duration_ms int;

-- Add constraint for indexer status
ALTER TABLE indexer_checkpoint ADD CONSTRAINT indexer_status_check CHECK (indexer_status IN ('active', 'paused', 'error', 'rebuilding'));

-- Add index for event processing idempotency
CREATE INDEX IF NOT EXISTS idx_ledger_events_transaction_block ON ledger_events(transaction_id, block_number);
CREATE INDEX IF NOT EXISTS idx_ledger_events_entity ON ledger_events(entity_type, entity_id, event_name);

-- Add projection rebuilding tracking table
CREATE TABLE IF NOT EXISTS projection_rebuilds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_block bigint NOT NULL,
  to_block bigint,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  events_processed int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_projection_rebuilds_status ON projection_rebuilds(status);
`
} as const;
