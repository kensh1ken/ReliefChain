import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { SessionUser } from './auth.types';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest(); const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    try { request.user = await this.jwt.verifyAsync(auth.slice(7)); } catch { throw new UnauthorizedException(); }
    const roles = this.reflector.getAllAndOverride<SessionUser['role'][] >('roles', [context.getHandler(), context.getClass()]);
    if (roles && !roles.includes(request.user.role)) throw new ForbiddenException(); return true;
  }
}