import { createHash, randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { DatabaseService } from '../database.service';
import type { SessionUser } from './auth.types';

export function phoneHash(phone: string) { return createHash('sha256').update(phone.replace(/\s/g, '')).digest('hex'); }

@Injectable()
export class AuthService {
  constructor(private db: DatabaseService, private jwt: JwtService) {}
  async login(email: string, password: string) {
    const result = await this.db.query<any>('SELECT * FROM users WHERE lower(email)=lower($1)', [email]); const user = result.rows[0];
    if (!user || !(await argon2.verify(user.password_hash, password))) throw new UnauthorizedException('Invalid credentials');
    const claims: SessionUser = { sub: user.id, role: user.role, orgMsp: user.org_msp, districtCode: user.district_code };
    return { accessToken: await this.jwt.signAsync(claims), user: { displayName: user.display_name, role: user.role, organization: user.org_msp } };
  }
  async requestOtp(phone: string) {
    const normalized = phone.replace(/\s/g, ''), hash = phoneHash(normalized);
    const beneficiary = await this.db.query('SELECT id FROM beneficiaries WHERE phone_hash=$1', [hash]);
    if (!beneficiary.rowCount) return { accepted: true, maskedPhone: '+91••••••••' };
    const recent = await this.db.query<any>("SELECT last_sent_at FROM otp_challenges WHERE phone_hash=$1 AND last_sent_at > now()-interval '30 seconds' ORDER BY last_sent_at DESC LIMIT 1", [hash]);
    if (recent.rowCount) throw new ForbiddenException('Please wait before requesting another code');
    await this.db.query('INSERT INTO otp_challenges(id,phone_hash,otp_hash,expires_at) VALUES($1,$2,$3,now()+interval \'5 minutes\')', [randomUUID(), hash, await argon2.hash(process.env.MOCK_OTP!),]);
    return { accepted: true, maskedPhone: `${normalized.slice(0, 3)}•••••${normalized.slice(-2)}`, expiresInSeconds: 300 };
  }
  async verifyOtp(phone: string, otp: string) {
    const hash = phoneHash(phone), result = await this.db.query<any>("SELECT * FROM otp_challenges WHERE phone_hash=$1 AND consumed_at IS NULL AND expires_at>now() ORDER BY last_sent_at DESC LIMIT 1", [hash]);
    const challenge = result.rows[0]; if (!challenge || challenge.attempts >= 5) throw new UnauthorizedException('Code expired or unavailable');
    await this.db.query('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=$1', [challenge.id]);
    if (!(await argon2.verify(challenge.otp_hash, otp))) throw new UnauthorizedException('Incorrect code');
    const beneficiary = await this.db.query<any>('SELECT id FROM beneficiaries WHERE phone_hash=$1', [hash]);
    if (!beneficiary.rowCount) throw new UnauthorizedException('Beneficiary not found');
    await this.db.query('UPDATE otp_challenges SET consumed_at=now() WHERE id=$1', [challenge.id]);
    const claims: SessionUser = { sub: beneficiary.rows[0].id, beneficiaryId: beneficiary.rows[0].id, role: 'BENEFICIARY' };
    return { accessToken: await this.jwt.signAsync(claims) };
  }
}