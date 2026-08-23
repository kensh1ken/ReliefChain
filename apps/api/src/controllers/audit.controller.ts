import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { DatabaseService } from '../database.service';
import { numbers } from './shared';
import { LedgerRepository } from '../repositories/ledger.repository';

@Controller('audit') @UseGuards(JwtGuard) @Roles('AUDITOR')
export class AuditController {
	constructor(private db: DatabaseService, private ledgerEvents: LedgerRepository) {}
	@Get('events') async events(@Query('type') type?: string, @Query('before') before?: string, @Query('limit') limit = '100') { const page = await this.ledgerEvents.listEvents({ type, beforeSequence: before ? Number(before) : undefined, limit: Number(limit) || 100 }); return before ? page : page.items; }
	@Get('reconciliation') async reconciliation() { const q = await this.db.query<any>(`SELECT fs.id,fs.name,fs.source_type,fs.amount_paise,fs.allocated_paise,COALESCE(sum(a.disbursed_paise),0) disbursed_paise,COALESCE(sum(a.reserved_paise),0) pending_paise,fs.amount_paise-COALESCE(sum(a.disbursed_paise),0)-COALESCE(sum(a.reserved_paise),0) remaining_paise FROM fund_sources fs LEFT JOIN allocations a ON a.source_id=fs.id GROUP BY fs.id ORDER BY fs.created_at`); return q.rows.map(numbers); }
	@Get('export.csv') @Header('Content-Type', 'text/csv') @Header('Content-Disposition', 'attachment; filename="reliefchain-audit.csv"') async csv() { const q = await this.db.query<any>(`SELECT d.public_reference,a.district_code,s.name scheme,fs.source_type,d.amount_paise,d.status,d.created_at,d.updated_at,d.proof->>'transactionId' transaction_id FROM disbursements d JOIN allocations a ON a.id=d.allocation_id JOIN schemes s ON s.id=a.scheme_id JOIN fund_sources fs ON fs.id=a.source_id ORDER BY d.created_at`); const escape = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`; return ['public_reference,district_code,scheme,source_type,amount_paise,status,created_at,updated_at,transaction_id', ...q.rows.map((r) => Object.values(r).map(escape).join(','))].join('\n'); }
}