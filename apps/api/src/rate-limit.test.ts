import { describe, expect, it } from 'vitest';
import { RateLimitService } from './rate-limit.service';

function limiter() {
  const counts = new Map<string, number>();
  const db = { query: async (_sql: string, values: unknown[]) => { const key = `${values[0]}:${values[1]}`; const count = (counts.get(key) ?? 0) + 1; counts.set(key, count); return { rows: [{ request_count: count }] }; } } as any;
  return new RateLimitService(db);
}

describe('endpoint rate limits', () => {
  it('rejects requests after the configured bucket limit', async () => {
    const rateLimit = limiter();
    await rateLimit.check('login', 'client', 1, 60_000);
    await expect(rateLimit.check('login', 'client', 1, 60_000)).rejects.toThrow('Rate limit exceeded');
  });
  it('keeps separate buckets independent', async () => {
    const rateLimit = limiter();
    await rateLimit.check('login', 'client', 1, 60_000);
    await expect(rateLimit.check('otp-verify', 'client', 1, 60_000)).resolves.toBeUndefined();
  });
});