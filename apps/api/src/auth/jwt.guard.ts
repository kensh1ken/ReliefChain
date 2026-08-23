import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { SessionUser } from './auth.types';
import { DatabaseService } from '../database.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector, private db: DatabaseService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest(); const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      request.user = await this.jwt.verifyAsync<SessionUser>(auth.slice(7));
      if (request.user.jti && (await this.db.query('SELECT 1 FROM token_revocations WHERE token_id=$1 AND expires_at>now()', [request.user.jti])).rowCount) throw new UnauthorizedException();
    } catch { throw new UnauthorizedException(); }
    const roles = this.reflector.getAllAndOverride<SessionUser['role'][] >('roles', [context.getHandler(), context.getClass()]);
    if (roles && !roles.includes(request.user.role)) throw new ForbiddenException(); return true;
  }
}