export const migration = {
  id: '004_session_subjects',
  up: `
ALTER TABLE staff_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE staff_sessions ADD COLUMN IF NOT EXISTS beneficiary_id uuid REFERENCES beneficiaries(id);
DO $$ BEGIN
  ALTER TABLE staff_sessions ADD CONSTRAINT staff_sessions_subject_check CHECK ((user_id IS NOT NULL) <> (beneficiary_id IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_staff_sessions_beneficiary ON staff_sessions(beneficiary_id, expires_at);
`
} as const;