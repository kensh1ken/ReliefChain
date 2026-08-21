export const schemaSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, password_hash text NOT NULL,
  display_name text NOT NULL, role text NOT NULL CHECK (role IN ('GOVERNMENT','NGO','AUDITOR')),
  org_msp text NOT NULL, district_code text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS disasters (
  id uuid PRIMARY KEY, name text NOT NULL, state_code text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS schemes (
  id uuid PRIMARY KEY, disaster_id uuid NOT NULL REFERENCES disasters(id), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fund_sources (
  id uuid PRIMARY KEY, disaster_id uuid NOT NULL REFERENCES disasters(id), name text NOT NULL, source_type text NOT NULL,
  owner_msp text NOT NULL, amount_paise bigint NOT NULL CHECK(amount_paise > 0), allocated_paise bigint NOT NULL DEFAULT 0,
  proof jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS allocations (
  id uuid PRIMARY KEY, source_id uuid NOT NULL REFERENCES fund_sources(id), scheme_id uuid NOT NULL REFERENCES schemes(id),
  district_code text NOT NULL, owner_msp text NOT NULL, amount_paise bigint NOT NULL CHECK(amount_paise > 0),
  reserved_paise bigint NOT NULL DEFAULT 0, disbursed_paise bigint NOT NULL DEFAULT 0, proof jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS beneficiaries (
  id uuid PRIMARY KEY, beneficiary_ref text UNIQUE NOT NULL, name_enc text NOT NULL, phone_enc text NOT NULL,
  phone_hash text UNIQUE NOT NULL, district_code text NOT NULL, scheme_id uuid NOT NULL REFERENCES schemes(id),
  promised_paise bigint NOT NULL DEFAULT 0, proof jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS otp_challenges (
  id uuid PRIMARY KEY, phone_hash text NOT NULL, otp_hash text NOT NULL, attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL, last_sent_at timestamptz NOT NULL DEFAULT now(), consumed_at timestamptz
);
CREATE TABLE IF NOT EXISTS disbursements (
  id uuid PRIMARY KEY, public_reference text UNIQUE NOT NULL, allocation_id uuid NOT NULL REFERENCES allocations(id),
  beneficiary_id uuid NOT NULL REFERENCES beneficiaries(id), beneficiary_ref text NOT NULL, amount_paise bigint NOT NULL,
  status text NOT NULL CHECK(status IN ('PENDING','SETTLED','FAILED','REVERSED')), idempotency_key text UNIQUE NOT NULL,
  simulated_outcome text NOT NULL, bank_reference text, failure_reason text, proof jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payout_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), disbursement_id uuid UNIQUE NOT NULL REFERENCES disbursements(id),
  outcome text NOT NULL, attempts int NOT NULL DEFAULT 0, run_after timestamptz NOT NULL, completed_at timestamptz, last_error text
);
CREATE TABLE IF NOT EXISTS ledger_events (
  sequence bigserial PRIMARY KEY, event_name text NOT NULL, entity_type text NOT NULL, entity_id text NOT NULL,
  payload jsonb NOT NULL, transaction_id text UNIQUE NOT NULL, block_number bigint, committed_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS indexer_checkpoint (
  id int PRIMARY KEY DEFAULT 1 CHECK(id=1), block_number bigint NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO indexer_checkpoint(id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_disbursements_status ON disbursements(status);
CREATE INDEX IF NOT EXISTS idx_disbursements_beneficiary ON disbursements(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_allocations_district ON allocations(district_code);
`;
