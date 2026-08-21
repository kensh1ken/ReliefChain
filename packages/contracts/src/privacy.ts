import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

export function beneficiaryReference(aadhaar: string, secret: string): string {
  const normalized = aadhaar.replace(/\D/g, '');
  if (!/^\d{12}$/.test(normalized)) throw new Error('Synthetic Aadhaar must contain 12 digits');
  return `ben_${createHmac('sha256', secret).update(normalized).digest('hex')}`;
}

export function encryptPii(value: string, base64Key: string): string {
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== 32) throw new Error('PII_ENCRYPTION_KEY must decode to 32 bytes');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptPii(value: string, base64Key: string): string {
  const [iv, tag, ciphertext] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(base64Key, 'base64'), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function maskPhone(phone: string): string {
  return `${phone.slice(0, 3)}•••••${phone.slice(-2)}`;
}
