import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { LedgerService } from './ledger';
import { LedgerIndexerService } from './ledger-indexer.service';
import { RetentionService } from './retention.service';
import { RateLimitService } from './rate-limit.service';
import { IdentityService } from './identity.service';

@Global()
@Module({ providers: [DatabaseService, LedgerService, LedgerIndexerService, RetentionService, RateLimitService, IdentityService], exports: [DatabaseService, LedgerService, LedgerIndexerService, RetentionService, RateLimitService, IdentityService] })
export class CoreModule {}