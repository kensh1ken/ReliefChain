import { Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller';
import { AuthModule } from './auth.module';
import { LedgerRepository } from './repositories/ledger.repository';
import { ProjectionRepository } from './repositories/projection.repository';

@Module({ imports: [AuthModule], controllers: [AuditController], providers: [LedgerRepository, ProjectionRepository], exports: [LedgerRepository, ProjectionRepository] })
export class AuditModule {}