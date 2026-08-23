import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { LedgerService } from './ledger';

@Global()
@Module({ providers: [DatabaseService, LedgerService], exports: [DatabaseService, LedgerService] })
export class CoreModule {}