import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, AuthService, JwtGuard } from './auth';
import { AuditController, BeneficiaryController, HealthController, OperatorController, PublicController } from './controllers';
import { DatabaseService } from './database.service';
import { LedgerService } from './ledger';
import { PayoutWorker } from './worker';
import { ReliefService } from './relief.service';
import { SeedService } from './seed.service';

@Module({
  imports: [JwtModule.register({ global: true, secret: process.env.JWT_SECRET, signOptions: { expiresIn: '8h', issuer: 'reliefchain' } })],
  controllers: [AuthController, PublicController, OperatorController, BeneficiaryController, AuditController, HealthController],
  providers: [DatabaseService, LedgerService, ReliefService, AuthService, JwtGuard, PayoutWorker, SeedService],
  exports: [SeedService]
})
export class AppModule {}
