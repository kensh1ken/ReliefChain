import { Module } from '@nestjs/common';
import { OperatorController } from './controllers/operator.controller';
import { DomainModule } from './domain.module';
import { AuthModule } from './auth.module';

@Module({ imports: [AuthModule, DomainModule], controllers: [OperatorController] })
export class OperatorModule {}