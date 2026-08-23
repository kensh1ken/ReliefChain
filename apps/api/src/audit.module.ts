import { Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller';
import { AuthModule } from './auth.module';

@Module({ imports: [AuthModule], controllers: [AuditController] })
export class AuditModule {}