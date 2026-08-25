import { Controller, Get, Param, Req } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { RateLimitService } from '../rate-limit.service';
import { LedgerIndexerService } from '../ledger-indexer.service';
import { numbers } from './shared';

@Controller('public')
export class PublicController {
	constructor(private db: DatabaseService, private rateLimit: RateLimitService, private indexer: LedgerIndexerService) {}
	@Get('summary') async summary() {
		const q = await this.db.query<any>(`SELECT COALESCE((SELECT sum(amount_paise) FROM fund_sources),0) received_paise, COALESCE((SELECT sum(amount_paise) FROM allocations),0) allocated_paise, COALESCE((SELECT sum(amount_paise) FROM disbursements WHERE status='PENDING'),0) pending_paise, COALESCE((SELECT sum(amount_paise) FROM disbursements WHERE status='SETTLED'),0) disbursed_paise, COALESCE((SELECT sum(amount_paise) FROM disbursements WHERE status='FAILED'),0) failed_paise, (SELECT updated_at FROM indexer_checkpoint WHERE id=1) last_indexed_at`);
		const row = numbers(q.rows[0]);
		
		// Add indexer freshness metadata
		const indexerState = this.indexer.getState();
		const freshness = {
			lastProcessedBlock: indexerState.lastProcessedBlock,
			projectionLag: indexerState.projectionLag,
			lastSyncTime: indexerState.lastSyncTime,
			ledgerMode: process.env.LEDGER_MODE || 'memory'
		};
		
		return { 
			...row, 
			remaining_paise: row.received_paise - row.disbursed_paise - row.pending_paise, 
			source: process.env.LEDGER_MODE === 'fabric' ? 'FABRIC_INDEX' : 'MEMORY_SIMULATION',
			freshness 
		};
	}
	@Get('districts') async districts() {
		const q = await this.db.query<any>(`SELECT a.district_code,s.name scheme_name,fs.source_type,count(DISTINCT d.beneficiary_id)::int beneficiary_count, sum(CASE WHEN d.status='SETTLED' THEN d.amount_paise ELSE 0 END) disbursed_paise, sum(CASE WHEN d.status='PENDING' THEN d.amount_paise ELSE 0 END) pending_paise FROM disbursements d JOIN allocations a ON a.id=d.allocation_id JOIN schemes s ON s.id=a.scheme_id JOIN fund_sources fs ON fs.id=a.source_id GROUP BY a.district_code,s.name,fs.source_type HAVING count(DISTINCT d.beneficiary_id)>=3 ORDER BY a.district_code`);
		return q.rows.map(numbers);
	}
	@Get('proof/:reference') async proof(@Param('reference') reference: string, @Req() req: any) {
		await this.rateLimit.check('proof', req.ip ?? 'unknown', Number(process.env.PROOF_RATE_LIMIT ?? 30), 60_000);
		const q = await this.db.query<any>(`SELECT d.public_reference,d.amount_paise,d.status,d.proof,d.created_at,d.updated_at,a.district_code,s.name scheme_name,fs.source_type FROM disbursements d JOIN allocations a ON a.id=d.allocation_id JOIN schemes s ON s.id=a.scheme_id JOIN fund_sources fs ON fs.id=a.source_id WHERE d.public_reference=$1`, [reference]);
		return q.rowCount ? numbers(q.rows[0]) : { found: false };
	}
}