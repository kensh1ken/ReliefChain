import { SetMetadata } from '@nestjs/common';
import type { SessionUser } from './auth.types';

export const Roles = (...roles: SessionUser['role'][]) => SetMetadata('roles', roles);