import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { beneficiaryReference, decryptPii, encryptPii } from '@reliefchain/contracts';

@Injectable()
export class IdentityService {
  private encryptionKeys = this.parseKeys('PII_ENCRYPTION_KEYS', 'PII_ENCRYPTION_KEY', 'PII_ENCRYPTION_KEY_VERSION');
  private hmacKeys = this.parseKeys('BENEFICIARY_HMAC_KEYS', 'BENEFICIARY_HMAC_SECRET', 'BENEFICIARY_HMAC_KEY_VERSION');
  readonly encryptionKeyVersion = process.env.PII_ENCRYPTION_KEY_VERSION ?? '1';
  readonly hmacKeyVersion = process.env.BENEFICIARY_HMAC_KEY_VERSION ?? '1';

  private parseKeys(ringName: string, fallbackName: string, fallbackVersionName: string) {
    const configured = process.env[ringName];
    const pairs = configured ? configured.split(',').map((entry) => entry.split(':', 2) as [string, string]) : [[process.env[fallbackVersionName] ?? '1', process.env[fallbackName] ?? ''] as [string, string]];
    return new Map(pairs.filter(([, key]) => key).map(([version, key]) => [version, key]));
  }

  beneficiaryReference(identifier: string) { return beneficiaryReference(identifier, this.hmacKeys.get(this.hmacKeyVersion) ?? ''); }
  matchesBeneficiaryReference(identifier: string, reference: string) { return [...this.hmacKeys.values()].some((secret) => beneficiaryReference(identifier, secret) === reference); }
  encrypt(value: string) { return `v${this.encryptionKeyVersion}.${encryptPii(value, this.encryptionKeys.get(this.encryptionKeyVersion) ?? '')}`; }
  decrypt(value: string) {
    const separator = value.startsWith('v') ? value.indexOf('.') : -1;
    const [version, ciphertext] = separator > 0 ? [value.slice(0, separator), value.slice(separator + 1)] : [this.encryptionKeyVersion, value];
    return decryptPii(ciphertext, this.encryptionKeys.get(version.slice(1)) ?? this.encryptionKeys.get(this.encryptionKeyVersion) ?? '');
  }
  phoneHash(phone: string) { return createHash('sha256').update(phone.replace(/\s/g, '')).digest('hex'); }
}