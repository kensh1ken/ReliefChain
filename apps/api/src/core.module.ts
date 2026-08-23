import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { LedgerService } from './ledger';
import { RetentionService } from './retention.service';

@Global()
@Module({ providers: [DatabaseService, LedgerService, RetentionService], exports: [DatabaseService, LedgerService, RetentionService] })
export class CoreModule {}