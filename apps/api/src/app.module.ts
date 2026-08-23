import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { AuditModule } from './audit.module';
import { BeneficiaryModule } from './beneficiary.module';
import { CoreModule } from './core.module';
import { DomainModule } from './domain.module';
import { HealthModule } from './health.module';
import { OperatorModule } from './operator.module';
import { PublicModule } from './public.module';
import { PayoutWorker } from './worker';
import { SeedService } from './seed.service';

@Module({
  imports: [CoreModule, AuthModule, DomainModule, PublicModule, OperatorModule, BeneficiaryModule, AuditModule, HealthModule],
  providers: [PayoutWorker, SeedService],
  exports: [SeedService]
})
export class AppModule {}
