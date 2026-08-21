import { afterEach, describe, expect, it } from 'vitest';
import { phoneHash } from './auth';
import { validateConfig } from './config';

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

describe('API security boundaries', () => {
  it('normalizes phones before lookup without retaining the value', () => {
    const local = '98765'.repeat(2);
    expect(phoneHash(`+91 ${local}`)).toBe(phoneHash(`+91${local}`));
    expect(phoneHash(`+91${local}`)).not.toContain(local);
  });
  it('rejects startup without explicit secrets', () => {
    delete process.env.JWT_SECRET; delete process.env.PII_ENCRYPTION_KEY; delete process.env.BENEFICIARY_HMAC_SECRET;
    process.env.DATABASE_URL = 'postgres://example';
    expect(validateConfig).toThrow('Missing required environment variables');
  });
  it('accepts properly sized non-production test secrets', () => {
    process.env.DATABASE_URL = 'postgres://example'; process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.PII_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64'); process.env.BENEFICIARY_HMAC_SECRET = 'y'.repeat(32); process.env.MOCK_OTP = '7'.repeat(6); process.env.AUTO_SEED = 'false';
    expect(validateConfig).not.toThrow();
  });
});
