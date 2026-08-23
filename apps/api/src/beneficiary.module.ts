import { Module } from '@nestjs/common';
import { BeneficiaryController } from './controllers/beneficiary.controller';
import { AuthModule } from './auth.module';
import { DomainModule } from './domain.module';

@Module({ imports: [AuthModule, DomainModule], controllers: [BeneficiaryController] })
export class BeneficiaryModule {}