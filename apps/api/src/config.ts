export function validateConfig() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'PII_ENCRYPTION_KEY', 'BENEFICIARY_HMAC_SECRET'];
  if (process.env.NODE_ENV !== 'production') required.push('MOCK_OTP');
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  if ((process.env.JWT_SECRET?.length ?? 0) < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  if ((process.env.BENEFICIARY_HMAC_SECRET?.length ?? 0) < 32) throw new Error('BENEFICIARY_HMAC_SECRET must be at least 32 characters');
  if (Buffer.from(process.env.PII_ENCRYPTION_KEY!, 'base64').length !== 32) throw new Error('PII_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  for (const ring of [process.env.PII_ENCRYPTION_KEYS, process.env.BENEFICIARY_HMAC_KEYS].filter(Boolean)) {
    for (const entry of ring!.split(',')) { const [, key = ''] = entry.split(':', 2); if (key && (ring === process.env.PII_ENCRYPTION_KEYS ? Buffer.from(key, 'base64').length !== 32 : key.length < 32)) throw new Error('Configured key ring contains an invalid key'); }
  }
  if (process.env.MOCK_OTP && !/^\d{6}$/.test(process.env.MOCK_OTP)) throw new Error('MOCK_OTP must contain exactly six digits');
  const accessTtl = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900), refreshDays = Number(process.env.REFRESH_TOKEN_DAYS ?? 30);
  if (!Number.isInteger(accessTtl) || accessTtl < 60 || accessTtl > 3600) throw new Error('ACCESS_TOKEN_TTL_SECONDS must be between 60 and 3600');
  if (!Number.isInteger(refreshDays) || refreshDays < 1 || refreshDays > 90) throw new Error('REFRESH_TOKEN_DAYS must be between 1 and 90');
  if (process.env.NODE_ENV === 'production' && process.env.MOCK_OTP) throw new Error('MOCK_OTP must not be configured in production');
  if (process.env.AUTO_SEED === 'true' && !/^\+91\d{10}$/.test(process.env.DEMO_BENEFICIARY_PHONE ?? '')) throw new Error('DEMO_BENEFICIARY_PHONE is required for automatic demo seeding');
}
