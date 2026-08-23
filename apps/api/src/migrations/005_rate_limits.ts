export const migration = {
  id: '005_rate_limits',
  up: `
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket text NOT NULL, key_hash text NOT NULL, window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count int NOT NULL DEFAULT 0 CHECK (request_count >= 0), PRIMARY KEY (bucket, key_hash)
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_window ON rate_limit_buckets(window_started_at);
`
} as const;