import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { getRetentionPolicy } from './retention';

@Injectable()
export class RetentionService {
  constructor(private db: DatabaseService) {}

  async purgeExpired() {
    const policy = getRetentionPolicy();
    return this.db.transaction(async (client) => {
      const otp = await client.query('DELETE FROM otp_challenges WHERE expires_at < now() - ($1 || \' days\')::interval', [policy.otpChallengesDays]);
      const sessions = await client.query('DELETE FROM staff_sessions WHERE expires_at < now() - ($1 || \' days\')::interval OR revoked_at < now() - ($1 || \' days\')::interval', [policy.sessionsDays]);
      const revocations = await client.query('DELETE FROM token_revocations WHERE expires_at < now() - ($1 || \' days\')::interval', [policy.tokenRevocationsDays]);
      const outbox = await client.query('DELETE FROM outbox_events WHERE published_at < now() - ($1 || \' days\')::interval', [policy.outboxEventsDays]);
      return { otp: otp.rowCount, sessions: sessions.rowCount, revocations: revocations.rowCount, outbox: outbox.rowCount };
    });
  }
}