import { describe, expect, it } from 'vitest';
import { beneficiaryReference, decryptPii, encryptPii, maskPhone } from './privacy';

const key = Buffer.alloc(32, 7).toString('base64');
describe('privacy helpers', () => {
  it('creates deterministic secret-bound references', () => {
    const identifier = '1234'.repeat(3), spaced = identifier.match(/.{1,4}/g)!.join(' ');
    expect(beneficiaryReference(spaced, 'secret')).toBe(beneficiaryReference(identifier, 'secret'));
    expect(beneficiaryReference(identifier, 'secret')).not.toContain(identifier);
  });
  it('round trips authenticated encryption', () => expect(decryptPii(encryptPii('private', key), key)).toBe('private'));
  it('masks phones', () => expect(maskPhone(`+91${'98765'.repeat(2)}`)).toBe('+91•••••65'));
});
