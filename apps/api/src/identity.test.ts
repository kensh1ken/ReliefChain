import { describe, expect, it } from 'vitest';
import { IdentityService } from './identity.service';

describe('identity service', () => {
  it('preserves privacy formats and exposes configured key versions', () => {
    process.env.PII_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64');
    process.env.BENEFICIARY_HMAC_SECRET = 'identity-test-secret';
    process.env.PII_ENCRYPTION_KEY_VERSION = '2'; process.env.BENEFICIARY_HMAC_KEY_VERSION = '3';
    const identity = new IdentityService();
    expect(identity.encryptionKeyVersion).toBe('2');
    expect(identity.hmacKeyVersion).toBe('3');
    expect(identity.decrypt(identity.encrypt('private'))).toBe('private');
    expect(identity.beneficiaryReference('123456789012')).toMatch(/^ben_[a-f0-9]{64}$/);
  });
  it('decrypts values encrypted with a previous configured key version', () => {
    const oldKey = Buffer.alloc(32, 4).toString('base64'); const newKey = Buffer.alloc(32, 5).toString('base64');
    process.env.PII_ENCRYPTION_KEYS = `1:${oldKey},2:${newKey}`; process.env.PII_ENCRYPTION_KEY_VERSION = '2';
    const oldIdentity = new IdentityService(); process.env.PII_ENCRYPTION_KEY_VERSION = '1';
    const encrypted = oldIdentity.encrypt('rotatable'); process.env.PII_ENCRYPTION_KEY_VERSION = '2';
    expect(new IdentityService().decrypt(encrypted)).toBe('rotatable');
  });
});