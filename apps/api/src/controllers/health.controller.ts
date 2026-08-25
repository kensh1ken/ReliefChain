import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { LedgerIndexerService } from '../ledger-indexer.service';

@Controller('health')
export class HealthController {
	constructor(private db: DatabaseService, private indexer: LedgerIndexerService) {}
	@Get() async get() { 
		await this.db.query('SELECT 1');
		const baseHealth = { 
			status: 'ok', 
			ledgerMode: process.env.LEDGER_MODE ?? 'memory', 
			timestamp: new Date().toISOString() 
		};
		
		// Add indexer health if available
		if (process.env.LEDGER_MODE === 'fabric') {
			const indexerHealth = await this.indexer.getHealthStatus();
			return { ...baseHealth, indexer: indexerHealth };
		}
		
		return baseHealth;
	}
}