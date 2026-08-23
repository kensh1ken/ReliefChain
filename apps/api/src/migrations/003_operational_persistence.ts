export const migration = {
  id: '003_operational_persistence',
  up: `
CREATE TABLE IF NOT EXISTS staff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id), beneficiary_id uuid REFERENCES beneficiaries(id),
  refresh_token_hash text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL, revoked_at timestamptz, replaced_by uuid REFERENCES staff_sessions(id),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_user ON staff_sessions(user_id, expires_at);
CREATE TABLE IF NOT EXISTS token_revocations (
  token_id text PRIMARY KEY, subject_id uuid, revoked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_token_revocations_expiry ON token_revocations(expires_at);
CREATE TABLE IF NOT EXISTS payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_msp text NOT NULL,
  status text NOT NULL CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','SUBMITTED','COMPLETED','FAILED','CANCELLED')),
  created_by uuid REFERENCES users(id), approved_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payout_batches_owner_status ON payout_batches(owner_msp, status);
CREATE TABLE IF NOT EXISTS payout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), disbursement_id uuid NOT NULL REFERENCES disbursements(id),
  attempt_number int NOT NULL CHECK (attempt_number > 0), status text NOT NULL,
  provider_reference text, error_code text, error_message text, started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz, UNIQUE(disbursement_id, attempt_number), UNIQUE(provider_reference)
);
CREATE INDEX IF NOT EXISTS idx_payout_attempts_disbursement ON payout_attempts(disbursement_id, attempt_number);
CREATE TABLE IF NOT EXISTS dead_letter_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payout_job_id uuid UNIQUE NOT NULL REFERENCES payout_jobs(id),
  reason text NOT NULL, attempts int NOT NULL CHECK (attempts >= 0), created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz, resolved_by uuid REFERENCES users(id), resolution text
);
CREATE TABLE IF NOT EXISTS audit_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), auditor_id uuid NOT NULL REFERENCES users(id),
  entity_type text NOT NULL, entity_id text NOT NULL, note text NOT NULL,
  case_status text NOT NULL DEFAULT 'OPEN' CHECK (case_status IN ('OPEN','IN_REVIEW','RESOLVED','DISMISSED')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_annotations_entity ON audit_annotations(entity_type, entity_id, case_status);
CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL, aggregate_type text NOT NULL,
  aggregate_id text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz, attempts int NOT NULL DEFAULT 0 CHECK (attempts >= 0), last_error text
);
CREATE INDEX IF NOT EXISTS idx_outbox_events_pending ON outbox_events(created_at) WHERE published_at IS NULL;
CREATE TABLE IF NOT EXISTS api_audit_actions (
  id bigserial PRIMARY KEY, actor_id uuid, actor_role text, action text NOT NULL,
  resource_type text, resource_id text, correlation_id text, details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_audit_actions_created ON api_audit_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_audit_actions_actor ON api_audit_actions(actor_id, created_at DESC);
`
} as const;