export const migration = {
  id: '002_integrity_indexes',
  up: `
DO $$ BEGIN
  ALTER TABLE disbursements ADD CONSTRAINT disbursements_amount_positive CHECK (amount_paise > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE payout_jobs ADD CONSTRAINT payout_jobs_attempts_nonnegative CHECK (attempts >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE payout_jobs ADD CONSTRAINT payout_jobs_outcome_valid CHECK (outcome IN ('SETTLED', 'FAILED'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_users_org_role ON users(org_msp, role);
CREATE INDEX IF NOT EXISTS idx_fund_sources_owner ON fund_sources(owner_msp);
CREATE INDEX IF NOT EXISTS idx_allocations_owner ON allocations(owner_msp);
CREATE INDEX IF NOT EXISTS idx_allocations_source ON allocations(source_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_idempotency ON disbursements(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payout_jobs_due ON payout_jobs(run_after) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_events_entity ON ledger_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ledger_events_block ON ledger_events(block_number);
`
} as const;