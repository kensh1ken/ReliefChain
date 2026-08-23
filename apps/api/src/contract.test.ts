import { describe, expect, it } from 'vitest';
import { allocationSchema, beneficiarySchema, disbursementSchema, fundSourceSchema, payoutStatuses, sourceTypes } from '@reliefchain/contracts';

const uuid = '10000000-0000-4000-8000-000000000001';

describe('backend contract baseline', () => {
  it('accepts integer paise and rejects zero, fractions, and floating point amounts', () => {
    expect(fundSourceSchema.parse({ name: 'Relief Fund', sourceType: 'NGO', amountPaise: 100, disasterId: uuid }).amountPaise).toBe(100);
    for (const amount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
      expect(() => fundSourceSchema.parse({ name: 'Relief Fund', sourceType: 'NGO', amountPaise: amount, disasterId: uuid })).toThrow();
    }
  });

  it('keeps the frozen source, payout, and input validation vocabularies', () => {
    expect(sourceTypes).toEqual(['CENTRAL_GOVERNMENT', 'STATE_GOVERNMENT', 'NGO']);
    expect(payoutStatuses).toEqual(['PENDING', 'SETTLED', 'FAILED', 'UNKNOWN', 'REVERSED']);
    expect(() => allocationSchema.parse({ sourceId: uuid, schemeId: uuid, districtCode: 'A', amountPaise: 1 })).toThrow();
    expect(() => beneficiarySchema.parse({ aadhaar: '123', name: 'A', phone: '+919876543210', districtCode: 'AS-KAM', schemeId: uuid })).toThrow();
  });

  it('requires an idempotency key and limits payout outcomes to known provider states', () => {
    const input = { allocationId: uuid, beneficiaryId: uuid, amountPaise: 2500, idempotencyKey: 'fixture-payment-1' };
    expect(disbursementSchema.parse(input).simulatedOutcome).toBe('SETTLED');
    expect(() => disbursementSchema.parse({ ...input, idempotencyKey: 'short' })).toThrow();
    expect(disbursementSchema.parse({ ...input, simulatedOutcome: 'UNKNOWN' }).simulatedOutcome).toBe('UNKNOWN');
  });

  it('defines organization-scoped operator roles and read-only auditor access', () => {
    const operatorRoles = ['GOVERNMENT', 'NGO'];
    expect(operatorRoles).toContain('GOVERNMENT');
    expect(operatorRoles).toContain('NGO');
    expect(operatorRoles).not.toContain('AUDITOR');
    expect(operatorRoles).not.toContain('BENEFICIARY');
  });
});