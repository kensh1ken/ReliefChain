import { afterEach, describe, expect, it } from 'vitest';
import { getRetentionPolicy } from './retention';

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

describe('retention policy', () => {
  it('provides explicit defaults for database-held ephemeral data', () => {
    delete process.env.RETENTION_OTP_DAYS;
    expect(getRetentionPolicy()).toMatchObject({ otpChallengesDays: 1, sessionsDays: 30, tokenRevocationsDays: 30, outboxEventsDays: 30 });
  });
  it('accepts positive integer overrides and ignores invalid values', () => {
    process.env.RETENTION_OTP_DAYS = '7'; process.env.RETENTION_SESSIONS_DAYS = '0'; process.env.RETENTION_OUTBOX_DAYS = 'nope';
    expect(getRetentionPolicy()).toMatchObject({ otpChallengesDays: 7, sessionsDays: 30, outboxEventsDays: 30 });
  });
  it('keeps unspecified external retention owners explicit', () => {
    expect(getRetentionPolicy()).toMatchObject({ encryptedContactsDays: null, externalLogsDays: null, exportsDays: null });
  });
});