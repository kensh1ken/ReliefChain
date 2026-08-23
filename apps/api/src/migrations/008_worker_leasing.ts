export const migration = {
  id: '008_worker_leasing',
  up: `
-- Add leasing and state management fields to payout_jobs
ALTER TABLE payout_jobs ADD COLUMN IF NOT EXISTS leased_until timestamptz;
ALTER TABLE payout_jobs ADD COLUMN IF NOT EXISTS leased_by text;
ALTER TABLE payout_jobs ADD COLUMN IF NOT EXISTS lease_version int NOT NULL DEFAULT 0;
ALTER TABLE payout_jobs ADD COLUMN IF NOT EXISTS status text;

-- Set default status for existing rows
UPDATE payout_jobs SET status = 'QUEUED' WHERE status IS NULL;

-- Make status NOT NULL and add constraint
ALTER TABLE payout_jobs ALTER COLUMN status SET NOT NULL;
ALTER TABLE payout_jobs ADD CONSTRAINT payout_jobs_status_check CHECK (status IN ('QUEUED','LEASED','DEAD_LETTERED','COMPLETED'));

-- Add indexes for efficient worker queries
CREATE INDEX IF NOT EXISTS idx_payout_jobs_leased ON payout_jobs(leased_until) WHERE leased_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payout_jobs_status_due ON payout_jobs(status, run_after) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payout_jobs_dead_letter ON payout_jobs(status) WHERE status = 'DEAD_LETTERED';

-- Add constraint to prevent lease conflicts
ALTER TABLE payout_jobs ADD CONSTRAINT payout_jobs_lease_valid CHECK (
  (leased_until IS NULL AND leased_by IS NULL) OR 
  (leased_until IS NOT NULL AND leased_by IS NOT NULL)
);
`
} as const;
