import { Controller, Get, Param, Req, Query } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { RateLimitService } from '../rate-limit.service';
import { LedgerIndexerService } from '../ledger-indexer.service';
import { numbers } from './shared';

@Controller('public')
export class PublicController {
	constructor(private db: DatabaseService, private rateLimit: RateLimitService, private indexer: LedgerIndexerService) {}
	
	@Get('summary') async summary(
		@Query('disasterId') disasterId?: string,
		@Query('districtCode') districtCode?: string,
		@Query('schemeId') schemeId?: string,
		@Query('sourceType') sourceType?: string,
		@Query('status') status?: string,
		@Query('fromDate') fromDate?: string,
		@Query('toDate') toDate?: string
	) {
		let whereClause = 'WHERE 1=1';
		const params: any[] = [];
		
		if (disasterId) {
			whereClause += ' AND dis.id = $' + (params.length + 1);
			params.push(disasterId);
		}
		if (districtCode) {
			whereClause += ' AND a.district_code = $' + (params.length + 1);
			params.push(districtCode);
		}
		if (schemeId) {
			whereClause += ' AND s.id = $' + (params.length + 1);
			params.push(schemeId);
		}
		if (sourceType) {
			whereClause += ' AND fs.source_type = $' + (params.length + 1);
			params.push(sourceType);
		}
		if (status) {
			whereClause += ' AND d.status = $' + (params.length + 1);
			params.push(status);
		}
		if (fromDate) {
			whereClause += ' AND d.created_at >= $' + (params.length + 1);
			params.push(fromDate);
		}
		if (toDate) {
			whereClause += ' AND d.created_at <= $' + (params.length + 1);
			params.push(toDate);
		}

		const baseQuery = `SELECT COALESCE((SELECT sum(fs.amount_paise) FROM fund_sources fs JOIN disasters dis ON fs.disaster_id = dis.id ${whereClause.replace('d.', 'fs.')}),0) received_paise, 
			COALESCE((SELECT sum(a.amount_paise) FROM allocations a JOIN schemes s ON a.scheme_id = s.id JOIN fund_sources fs ON fs.id = a.source_id JOIN disasters dis ON fs.disaster_id = dis.id ${whereClause.replace('d.', 'a.')}),0) allocated_paise, 
			COALESCE((SELECT sum(d.amount_paise) FROM disbursements d JOIN allocations a ON d.allocation_id = a.id JOIN schemes s ON a.scheme_id = s.id JOIN fund_sources fs ON fs.id = a.source_id JOIN disasters dis ON fs.disaster_id = dis.id ${whereClause} AND d.status='PENDING'),0) pending_paise, 
			COALESCE((SELECT sum(d.amount_paise) FROM disbursements d JOIN allocations a ON d.allocation_id = a.id JOIN schemes s ON a.scheme_id = s.id JOIN fund_sources fs ON fs.id = a.source_id JOIN disasters dis ON fs.disaster_id = dis.id ${whereClause} AND d.status='SETTLED'),0) disbursed_paise, 
			COALESCE((SELECT sum(d.amount_paise) FROM disbursements d JOIN allocations a ON d.allocation_id = a.id JOIN schemes s ON a.scheme_id = s.id JOIN fund_sources fs ON fs.id = a.source_id JOIN disasters dis ON fs.disaster_id = dis.id ${whereClause} AND d.status='FAILED'),0) failed_paise, 
			(SELECT updated_at FROM indexer_checkpoint WHERE id=1) last_indexed_at`;
		
		const q = await this.db.query<any>(baseQuery, params);
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
			freshness,
			filters: { disasterId, districtCode, schemeId, sourceType, status, fromDate, toDate }
		};
	}
	
	@Get('districts') async districts(
		@Query('disasterId') disasterId?: string,
		@Query('schemeId') schemeId?: string,
		@Query('sourceType') sourceType?: string,
		@Query('minBeneficiaries') minBeneficiaries?: string
	) {
		let whereClause = 'WHERE 1=1';
		const params: any[] = [];
		
		if (disasterId) {
			whereClause += ' AND dis.id = $' + (params.length + 1);
			params.push(disasterId);
		}
		if (schemeId) {
			whereClause += ' AND s.id = $' + (params.length + 1);
			params.push(schemeId);
		}
		if (sourceType) {
			whereClause += ' AND fs.source_type = $' + (params.length + 1);
			params.push(sourceType);
		}
		
		const parsedMinimum = minBeneficiaries ? Number.parseInt(minBeneficiaries, 10) : 3;
		const minBeneficiaryCount = Number.isFinite(parsedMinimum)
			? Math.min(Math.max(parsedMinimum, 3), 1000)
			: 3;
		params.push(minBeneficiaryCount);
		const minimumParam = `$${params.length}`;
		
		const q = await this.db.query<any>(
			`WITH filtered_allocations AS (
				SELECT a.id, a.district_code, a.amount_paise, s.name scheme_name, fs.source_type
				FROM allocations a
				JOIN schemes s ON s.id=a.scheme_id
				JOIN fund_sources fs ON fs.id=a.source_id
				JOIN disasters dis ON fs.disaster_id=dis.id
				${whereClause}
			), allocation_totals AS (
				SELECT district_code,
					COUNT(*)::int allocation_count,
					SUM(amount_paise) allocated_paise,
					COUNT(DISTINCT scheme_name)::int scheme_count,
					STRING_AGG(DISTINCT scheme_name, ', ' ORDER BY scheme_name) scheme_name,
					COUNT(DISTINCT source_type)::int source_count,
					STRING_AGG(DISTINCT source_type, ', ' ORDER BY source_type) source_type
				FROM filtered_allocations
				GROUP BY district_code
			), payout_totals AS (
				SELECT fa.district_code,
					COUNT(DISTINCT d.beneficiary_id)::int beneficiary_count,
					COUNT(d.id)::int payout_count,
					COUNT(*) FILTER (WHERE d.status='SETTLED')::int settled_count,
					COUNT(*) FILTER (WHERE d.status='PENDING')::int pending_count,
					COUNT(*) FILTER (WHERE d.status='FAILED')::int failed_count,
					COALESCE(SUM(d.amount_paise) FILTER (WHERE d.status='SETTLED'),0) disbursed_paise,
					COALESCE(SUM(d.amount_paise) FILTER (WHERE d.status='PENDING'),0) pending_paise,
					COALESCE(SUM(d.amount_paise) FILTER (WHERE d.status='FAILED'),0) failed_paise,
					COALESCE(AVG(d.amount_paise) FILTER (WHERE d.status='SETTLED'),0)::bigint average_payout_paise
				FROM filtered_allocations fa
				JOIN disbursements d ON d.allocation_id=fa.id
				GROUP BY fa.district_code
			)
			SELECT at.*, pt.beneficiary_count, pt.payout_count, pt.settled_count,
				pt.pending_count, pt.failed_count, pt.disbursed_paise, pt.pending_paise,
				pt.failed_paise, pt.average_payout_paise
			FROM allocation_totals at
			JOIN payout_totals pt ON pt.district_code=at.district_code
			WHERE pt.beneficiary_count >= ${minimumParam}
			ORDER BY pt.disbursed_paise DESC, at.district_code`,
			params
		);
		return q.rows.map(numbers);
	}
	
	@Get('proof/:reference') async proof(@Param('reference') reference: string, @Req() req: any) {
		await this.rateLimit.check('proof', req.ip ?? 'unknown', Number(process.env.PROOF_RATE_LIMIT ?? 30), 60_000);
		
		// Validate reference format
		if (!reference || !reference.match(/^RC-\d{4}-[A-Z0-9]{8}$/)) {
			return { 
				found: false, 
				error: 'INVALID_REFERENCE', 
				message: 'Invalid reference format. Expected format: RC-YYYY-XXXXXXXX' 
			};
		}
		
		const q = await this.db.query<any>(
			`SELECT d.public_reference,d.amount_paise,d.status,d.proof,d.created_at,d.updated_at,
				a.district_code,s.name scheme_name,fs.source_type,
				CASE 
					WHEN d.status = 'PENDING' THEN 'pending_confirmation'
					WHEN d.status = 'SETTLED' THEN 'confirmed'
					WHEN d.status = 'FAILED' THEN 'failed'
					WHEN d.status = 'UNKNOWN' THEN 'awaiting_reconciliation'
					WHEN d.status = 'REVERSED' THEN 'reversed'
					ELSE 'unknown'
				END status_description
			FROM disbursements d 
			JOIN allocations a ON a.id=d.allocation_id 
			JOIN schemes s ON s.id=a.scheme_id 
			JOIN fund_sources fs ON fs.id=a.source_id 
			WHERE d.public_reference=$1`,
			[reference]
		);
		
		if (!q.rowCount) {
			return { 
				found: false, 
				error: 'NOT_FOUND', 
				message: 'No disbursement found with this reference' 
			};
		}
		
		const result = numbers(q.rows[0]);
		
		// Add freshness metadata
		const indexerState = this.indexer.getState();
		return { 
			found: true, 
			...result, 
			freshness: {
				lastProcessedBlock: indexerState.lastProcessedBlock,
				projectionLag: indexerState.projectionLag,
				ledgerMode: process.env.LEDGER_MODE || 'memory'
			}
		};
	}
	
	@Get('disasters') async disasters() {
		const q = await this.db.query<any>(
			`SELECT id, name, state_code, created_at 
			FROM disasters 
			ORDER BY created_at DESC`
		);
		return q.rows.map(numbers);
	}
	
	@Get('schemes') async schemes(@Query('disasterId') disasterId?: string) {
		let whereClause = 'WHERE 1=1';
		const params: any[] = [];
		
		if (disasterId) {
			whereClause += ' AND disaster_id = $' + (params.length + 1);
			params.push(disasterId);
		}
		
		const q = await this.db.query<any>(
			`SELECT id, disaster_id, name, created_at 
			FROM schemes 
			${whereClause}
			ORDER BY name`,
			params
		);
		return q.rows.map(numbers);
	}
}
