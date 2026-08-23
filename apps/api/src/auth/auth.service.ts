import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { DatabaseService } from '../database.service';
import type { SessionUser } from './auth.types';
import { RateLimitService } from '../rate-limit.service';
import { OTP_PROVIDER } from './otp.port';
import type { OtpProvider } from './otp.port';

export function phoneHash(phone: string) { return createHash('sha256').update(phone.replace(/\s/g, '')).digest('hex'); }

@Injectable()
export class AuthService {
  constructor(private db: DatabaseService, private jwt: JwtService, private rateLimit: RateLimitService, @Inject(OTP_PROVIDER) private otpProvider: OtpProvider) {}
  private accessTokenTtlSeconds = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
  private refreshTokenDays = Number(process.env.REFRESH_TOKEN_DAYS ?? 30);

  private async issueTokens(claims: SessionUser) {
    const sessionId = randomUUID();
    const accessToken = await this.jwt.signAsync({ ...claims, jti: sessionId }, { expiresIn: this.accessTokenTtlSeconds });
    const refreshToken = randomBytes(32).toString('base64url');
    const subjectColumn = claims.beneficiaryId ? 'beneficiary_id' : 'user_id';
    await this.db.query(`INSERT INTO staff_sessions(id,${subjectColumn},refresh_token_hash,expires_at) VALUES($1,$2,$3,now()+($4 || ' days')::interval)`,
      [sessionId, claims.sub, createHash('sha256').update(refreshToken).digest('hex'), this.refreshTokenDays]);
    return { accessToken, refreshToken, expiresIn: this.accessTokenTtlSeconds };
  }
  async login(email: string, password: string, rateKey = email.toLowerCase()) {
    await this.rateLimit.check('login', rateKey, Number(process.env.LOGIN_RATE_LIMIT ?? 10), 60_000);
    const result = await this.db.query<any>('SELECT * FROM users WHERE lower(email)=lower($1)', [email]); const user = result.rows[0];
    if (!user || !(await argon2.verify(user.password_hash, password))) throw new UnauthorizedException('Invalid credentials');
    const claims: SessionUser = { sub: user.id, role: user.role, orgMsp: user.org_msp, districtCode: user.district_code };
    return { ...await this.issueTokens(claims), user: { displayName: user.display_name, role: user.role, organization: user.org_msp } };
  }
  async requestOtp(phone: string, rateKey = phone) {
    await this.rateLimit.check('otp-request', rateKey, Number(process.env.OTP_REQUEST_RATE_LIMIT ?? 3), 60_000);
    const normalized = phone.replace(/\s/g, ''), hash = phoneHash(normalized);
    const beneficiary = await this.db.query('SELECT id FROM beneficiaries WHERE phone_hash=$1', [hash]);
    if (!beneficiary.rowCount) return { accepted: true, maskedPhone: '+91••••••••' };
    const recent = await this.db.query<any>("SELECT last_sent_at FROM otp_challenges WHERE phone_hash=$1 AND last_sent_at > now()-interval '30 seconds' ORDER BY last_sent_at DESC LIMIT 1", [hash]);
    if (recent.rowCount) throw new ForbiddenException('Please wait before requesting another code');
    await this.db.query('INSERT INTO otp_challenges(id,phone_hash,otp_hash,expires_at) VALUES($1,$2,$3,now()+interval \'5 minutes\')', [randomUUID(), hash, await argon2.hash(await this.otpProvider.issue(normalized))]);
    return { accepted: true, maskedPhone: `${normalized.slice(0, 3)}•••••${normalized.slice(-2)}`, expiresInSeconds: 300 };
  }
  async verifyOtp(phone: string, otp: string, rateKey = phone) {
    await this.rateLimit.check('otp-verify', rateKey, Number(process.env.OTP_VERIFY_RATE_LIMIT ?? 5), 60_000);
    const hash = phoneHash(phone), result = await this.db.query<any>("SELECT * FROM otp_challenges WHERE phone_hash=$1 AND consumed_at IS NULL AND expires_at>now() ORDER BY last_sent_at DESC LIMIT 1", [hash]);
    const challenge = result.rows[0]; if (!challenge || challenge.attempts >= 5) throw new UnauthorizedException('Code expired or unavailable');
    await this.db.query('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=$1', [challenge.id]);
    if (!(await argon2.verify(challenge.otp_hash, otp))) throw new UnauthorizedException('Incorrect code');
    const beneficiary = await this.db.query<any>('SELECT id FROM beneficiaries WHERE phone_hash=$1', [hash]);
    if (!beneficiary.rowCount) throw new UnauthorizedException('Beneficiary not found');
    await this.db.query('UPDATE otp_challenges SET consumed_at=now() WHERE id=$1', [challenge.id]);
    const claims: SessionUser = { sub: beneficiary.rows[0].id, beneficiaryId: beneficiary.rows[0].id, role: 'BENEFICIARY' };
    return this.issueTokens(claims);
  }
  async refresh(refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    return this.db.transaction(async (client) => {
      const result = await client.query<any>(`SELECT s.*,COALESCE(u.id,b.id) subject_id,COALESCE(u.role,'BENEFICIARY') role,u.org_msp,u.district_code FROM staff_sessions s LEFT JOIN users u ON u.id=s.user_id LEFT JOIN beneficiaries b ON b.id=s.beneficiary_id WHERE s.refresh_token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() FOR UPDATE`, [hash]);
      const session = result.rows[0]; if (!session) throw new UnauthorizedException('Invalid refresh session');
      const claims: SessionUser = { sub: session.subject_id, role: session.role, orgMsp: session.org_msp, districtCode: session.district_code, beneficiaryId: session.beneficiary_id ?? undefined };
      const nextId = randomUUID(), nextRefresh = randomBytes(32).toString('base64url');
      const accessToken = await this.jwt.signAsync({ ...claims, jti: nextId }, { expiresIn: this.accessTokenTtlSeconds });
      const subjectColumn = claims.beneficiaryId ? 'beneficiary_id' : 'user_id';
      await client.query(`INSERT INTO staff_sessions(id,${subjectColumn},refresh_token_hash,expires_at) VALUES($1,$2,$3,now()+($4 || ' days')::interval)`, [nextId, session.subject_id, createHash('sha256').update(nextRefresh).digest('hex'), this.refreshTokenDays]);
      await client.query('UPDATE staff_sessions SET revoked_at=now(),last_used_at=now(),replaced_by=$1 WHERE id=$2', [nextId, session.id]);
      return { accessToken, refreshToken: nextRefresh, expiresIn: this.accessTokenTtlSeconds };
    });
  }
  async logout(accessToken: string, user: SessionUser) {
    if (user.jti && user.exp) await this.db.query('INSERT INTO token_revocations(token_id,subject_id,expires_at) VALUES($1,$2,to_timestamp($3)) ON CONFLICT(token_id) DO NOTHING', [user.jti, user.sub, user.exp]);
    if (user.jti) await this.db.query('UPDATE staff_sessions SET revoked_at=now() WHERE id=$1 AND user_id=$2', [user.jti, user.sub]);
    return { revoked: true };
  }
}