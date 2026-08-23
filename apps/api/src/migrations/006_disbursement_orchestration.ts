export const migration = {
  id: '006_disbursement_orchestration',
  up: `
ALTER TABLE disbursements DROP CONSTRAINT IF EXISTS disbursements_status_check;
ALTER TABLE disbursements ADD CONSTRAINT disbursements_status_check CHECK(status IN ('PENDING','SETTLED','FAILED','UNKNOWN','REVERSED'));
ALTER TABLE payout_jobs DROP CONSTRAINT IF EXISTS payout_jobs_outcome_valid;
ALTER TABLE payout_jobs ADD CONSTRAINT payout_jobs_outcome_valid CHECK (outcome IN ('SETTLED', 'FAILED', 'UNKNOWN'));
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES payout_batches(id);
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS reversal_of uuid REFERENCES disbursements(id);
CREATE INDEX IF NOT EXISTS idx_disbursements_batch ON disbursements(batch_id);
CREATE TABLE IF NOT EXISTS disbursement_requests (
  idempotency_key text PRIMARY KEY, request_hash text NOT NULL, disbursement_id uuid REFERENCES disbursements(id),
  status text NOT NULL CHECK (status IN ('PROCESSING','COMPLETED','UNKNOWN','FAILED')),
  response jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_status ON disbursement_requests(status);
`
} as const;