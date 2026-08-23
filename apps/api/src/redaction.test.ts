import { describe, expect, it } from 'vitest';
import { redactSensitive } from './redaction';

describe('sensitive data redaction', () => {
  it('redacts nested sensitive fields while preserving safe values', () => {
    expect(redactSensitive({ name: 'Private', nested: { phone: '+910000000000', amountPaise: 12 }, status: 'PENDING' })).toEqual({ name: '[REDACTED]', nested: { phone: '[REDACTED]', amountPaise: 12 }, status: 'PENDING' });
  });
});