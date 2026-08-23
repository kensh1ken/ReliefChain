export const migration = {
  id: '007_status_history',
  up: `
CREATE TABLE IF NOT EXISTS disbursement_status_history (
  id bigserial PRIMARY KEY, disbursement_id uuid NOT NULL REFERENCES disbursements(id),
  from_status text, to_status text NOT NULL, reason text, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_disbursement_status_history_disbursement ON disbursement_status_history(disbursement_id, created_at);
`
} as const;