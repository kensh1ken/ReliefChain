export function validateConfig() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'PII_ENCRYPTION_KEY', 'BENEFICIARY_HMAC_SECRET', 'MOCK_OTP'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  if ((process.env.JWT_SECRET?.length ?? 0) < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  if (Buffer.from(process.env.PII_ENCRYPTION_KEY!, 'base64').length !== 32) throw new Error('PII_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  if (!/^\d{6}$/.test(process.env.MOCK_OTP!)) throw new Error('MOCK_OTP must contain exactly six digits');
  if (process.env.AUTO_SEED === 'true' && !/^\+91\d{10}$/.test(process.env.DEMO_BENEFICIARY_PHONE ?? '')) throw new Error('DEMO_BENEFICIARY_PHONE is required for automatic demo seeding');
}
