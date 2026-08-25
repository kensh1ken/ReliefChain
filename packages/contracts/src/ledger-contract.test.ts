import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_LEDGER_PAISE, findProhibitedLedgerFields, formatLedgerError, ledgerErrorCodes,
  ledgerEventEnvelopeSchema, ledgerEventNames, ledgerReceiptSchema, ledgerTransactionNames,
  paiseStringSchema, parseLedgerError, parsePaiseString, providerReferenceHashSchema,
  validateLedgerEvent, validateTransactionFixture
} from './index';

const fixtureRoot = resolve(__dirname, '..', 'fixtures');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readFixtureDirectory(name: string): Array<{ file: string; value: unknown }> {
  const directory = resolve(fixtureRoot, name);
  return readdirSync(directory).filter((file) => file.endsWith('.json')).map((file) => ({
    file,
    value: readJson(resolve(directory, file))
  }));
}

describe('ledger transaction contract v1', () => {
  const fixtures = readFixtureDirectory('transactions');

  it('has exactly one valid fixture for every frozen transaction', () => {
    expect(fixtures.map(({ file }) => file.replace('.json', '')).sort()).toEqual([...ledgerTransactionNames].sort());
  });

  it.each(fixtures)('validates $file', ({ value }) => {
    expect(() => validateTransactionFixture(value)).not.toThrow();
  });

  it.each(readJson(resolve(fixtureRoot, 'invalid', 'transactions.json')) as Array<{ description: string; value: unknown }>)
    ('rejects $description', ({ value }) => {
      expect(() => validateTransactionFixture(value)).toThrow();
    });
});

describe('integer paise wire format', () => {
  it.each(['0', '-1', '+1', '01', '1.0', '1e3', '', ' 1'])('rejects %j', (value) => {
    expect(paiseStringSchema.safeParse(value).success).toBe(false);
  });

  it('accepts and parses the configured maximum', () => {
    expect(parsePaiseString(String(MAX_LEDGER_PAISE))).toBe(MAX_LEDGER_PAISE);
  });

  it('rejects values over the configured maximum', () => {
    expect(paiseStringSchema.safeParse(String(MAX_LEDGER_PAISE + 1)).success).toBe(false);
  });
});

describe('ledger event contract v1', () => {
  const fixtures = readFixtureDirectory('events');

  it('has exactly one valid fixture for every frozen event', () => {
    expect(fixtures.map(({ file }) => file.replace('.json', '')).sort()).toEqual([...ledgerEventNames].sort());
  });

  it.each(fixtures)('validates $file', ({ value }) => {
    expect(() => validateLedgerEvent(value)).not.toThrow();
    expect(ledgerEventEnvelopeSchema.safeParse(value).success).toBe(true);
  });

  it.each(readJson(resolve(fixtureRoot, 'invalid', 'events.json')) as Array<{ description: string; value: unknown }>)
    ('rejects $description', ({ value }) => {
      expect(ledgerEventEnvelopeSchema.safeParse(value).success).toBe(false);
    });

  it('allows a provider-reference hash and rejects raw or nested prohibited fields', () => {
    expect(providerReferenceHashSchema.safeParse(`sha256:${'a'.repeat(64)}`).success).toBe(true);
    expect(findProhibitedLedgerFields({ providerReferenceHash: `sha256:${'a'.repeat(64)}` })).toEqual([]);
    expect(findProhibitedLedgerFields({ nested: { bankReference: 'BANK-123', phone: '+911234567890' } })).toEqual([
      'payload.nested.bankReference', 'payload.nested.phone'
    ]);
  });

  it.each([
    'beneficiaryRef', 'idempotencyKey', 'bankReference', 'providerReference', 'name', 'phone',
    'aadhaar', 'otp', 'rawProviderError', 'errorMessage', 'secret', 'internalNotes'
  ])('rejects prohibited field %s recursively', (field) => {
    expect(findProhibitedLedgerFields({ nested: { [field]: 'private' } })).toEqual([`payload.nested.${field}`]);
  });

  it('rejects an event/entity type mismatch', () => {
    const fixture = readJson(resolve(fixtureRoot, 'events', 'DisasterRegistered.json')) as Record<string, unknown>;
    expect(ledgerEventEnvelopeSchema.safeParse({ ...fixture, entityType: 'scheme' }).success).toBe(false);
  });
});

describe('ledger receipts and stable errors', () => {
  it('validates the frozen committed receipt', () => {
    expect(ledgerReceiptSchema.safeParse({
      transactionId: 'tx0000000000000001', blockNumber: 12,
      committedAt: '2026-01-01T00:00:00.000Z', status: 'VALID'
    }).success).toBe(true);
  });

  it.each(ledgerErrorCodes)('round-trips %s', (code) => {
    expect(parseLedgerError(formatLedgerError(code, 'Test message'))).toEqual({ code, message: 'Test message' });
  });

  it('does not treat free-text or unknown codes as stable ledger errors', () => {
    expect(parseLedgerError('Something failed')).toBeNull();
    expect(parseLedgerError('[LEDGER_UNKNOWN] Something failed')).toBeNull();
  });
});
