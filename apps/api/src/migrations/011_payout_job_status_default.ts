export const migration = {
  id: '011_payout_job_status_default',
  up: `
ALTER TABLE payout_jobs ALTER COLUMN status SET DEFAULT 'QUEUED';
`
} as const;
