const sensitiveKeys = new Set(['aadhaar', 'name', 'phone', 'otp', 'password', 'password_hash', 'bankAccount', 'accountNumber', 'encryptionKey', 'jwtSecret', 'beneficiaryRef']);

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, sensitiveKeys.has(key) ? '[REDACTED]' : redactSensitive(nested)]));
}