import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from './auth/auth.types';

export function requireOrganization(user: SessionUser, ownerMsp: string) {
  if (!user.orgMsp || user.orgMsp !== ownerMsp) throw new ForbiddenException('Resource belongs to another organization');
}

export function requireDistrict(user: SessionUser, districtCode: string) {
  if (user.districtCode && user.districtCode !== districtCode) throw new ForbiddenException('Operator is restricted to another district');
}