export interface RetentionPolicy {
  otpChallengesDays: number;
  sessionsDays: number;
  tokenRevocationsDays: number;
  apiAuditActionsDays: number;
  outboxEventsDays: number;
  encryptedContactsDays: number | null;
  externalLogsDays: number | null;
  exportsDays: number | null;
}

function days(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function getRetentionPolicy(): RetentionPolicy {
  return {
    otpChallengesDays: days('RETENTION_OTP_DAYS', 1),
    sessionsDays: days('RETENTION_SESSIONS_DAYS', 30),
    tokenRevocationsDays: days('RETENTION_TOKEN_REVOCATIONS_DAYS', 30),
    apiAuditActionsDays: days('RETENTION_API_AUDIT_DAYS', 365),
    outboxEventsDays: days('RETENTION_OUTBOX_DAYS', 30),
    encryptedContactsDays: null,
    externalLogsDays: null,
    exportsDays: null
  };
}