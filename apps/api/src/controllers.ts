import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { allocationSchema, beneficiarySchema, fundSourceSchema } from '@reliefchain/contracts';
import { DatabaseService } from './database.service';
import { JwtGuard, Roles } from './auth';
import { ReliefService } from './relief.service';

const numbers = (row: Record<string, unknown>): any => Object.fromEntries(Object.entries(row).map(([k, v]) => (k.endsWith('_paise') && v != null ? [k, Number(v)] : [k, v])));

@Controller('public')
export class PublicController {
  constructor(private db: DatabaseService) {}
  @Get('summary') async summary() {
    const q = await this.db.query<any>(`SELECT
      COALESCE((SELECT sum(amount_paise) FROM fund_sources),0) received_paise,
      COALESCE((SELECT sum(amount_paise) FROM allocations),0) allocated_paise,
      COALESCE((SELECT sum(amount_paise) FROM disbursements WHERE status='PENDING'),0) pending_paise,
      COALESCE((SELECT sum(amount_paise) FROM disbursements WHERE status='SETTLED'),0) disbursed_paise,
      COALESCE((SELECT sum(amount_paise) FROM disbursements WHERE status='FAILED'),0) failed_paise,
      (SELECT updated_at FROM indexer_checkpoint WHERE id=1) last_indexed_at`);
    const row = numbers(q.rows[0]); return { ...row, remaining_paise: row.received_paise - row.disbursed_paise - row.pending_paise, source: 'FABRIC_INDEX' };
  }
  @Get('districts') async districts() {
    const q = await this.db.query<any>(`SELECT a.district_code,s.name scheme_name,fs.source_type,count(DISTINCT d.beneficiary_id)::int beneficiary_count,
      sum(CASE WHEN d.status='SETTLED' THEN d.amount_paise ELSE 0 END) disbursed_paise,
      sum(CASE WHEN d.status='PENDING' THEN d.amount_paise ELSE 0 END) pending_paise
      FROM disbursements d JOIN allocations a ON a.id=d.allocation_id JOIN schemes s ON s.id=a.scheme_id JOIN fund_sources fs ON fs.id=a.source_id
      GROUP BY a.district_code,s.name,fs.source_type HAVING count(DISTINCT d.beneficiary_id)>=3 ORDER BY a.district_code`);
    return q.rows.map(numbers);
  }
  @Get('proof/:reference') async proof(@Param('reference') reference: string) {
    const q = await this.db.query<any>(`SELECT d.public_reference,d.amount_paise,d.status,d.proof,d.created_at,d.updated_at,a.district_code,s.name scheme_name,fs.source_type
      FROM disbursements d JOIN allocations a ON a.id=d.allocation_id JOIN schemes s ON s.id=a.scheme_id JOIN fund_sources fs ON fs.id=a.source_id WHERE d.public_reference=$1`, [reference]);
    return q.rowCount ? numbers(q.rows[0]) : { found: false };
  }
}

@Controller('operator') @UseGuards(JwtGuard) @Roles('GOVERNMENT', 'NGO')
export class OperatorController {
  constructor(private relief: ReliefService, private db: DatabaseService) {}
  @Get('context') async context(@Req() req: any) {
    const [d, s, f, a, b, p] = await Promise.all([
      this.db.query('SELECT * FROM disasters ORDER BY created_at'), this.db.query('SELECT * FROM schemes ORDER BY name'),
      this.db.query('SELECT * FROM fund_sources WHERE owner_msp=$1 ORDER BY created_at DESC', [req.user.orgMsp]),
      this.db.query('SELECT * FROM allocations WHERE owner_msp=$1 ORDER BY created_at DESC', [req.user.orgMsp]),
      this.db.query('SELECT id,beneficiary_ref,district_code,scheme_id,promised_paise,created_at FROM beneficiaries ORDER BY created_at DESC'),
      this.db.query(`SELECT d.*,a.owner_msp FROM disbursements d JOIN allocations a ON a.id=d.allocation_id WHERE a.owner_msp=$1 ORDER BY d.created_at DESC`, [req.user.orgMsp])
    ]); return { disasters: d.rows, schemes: s.rows, sources: f.rows.map(numbers), allocations: a.rows.map(numbers), beneficiaries: b.rows.map(numbers), disbursements: p.rows.map(numbers) };
  }
  @Post('fund-sources') createSource(@Body() body: any, @Req() req: any) { return this.relief.createFundSource(fundSourceSchema.parse(body), req.user); }
  @Post('allocations') allocate(@Body() body: any, @Req() req: any) { return this.relief.allocate(allocationSchema.parse(body), req.user); }
  @Post('beneficiaries') beneficiary(@Body() body: any, @Req() req: any) { return this.relief.registerBeneficiary({ ...beneficiarySchema.parse(body), promisedPaise: body.promisedPaise }, req.user); }
  @Post('disbursements') disburse(@Body() body: any, @Req() req: any) { return this.relief.initiateDisbursement(body, req.user); }
  @Post('disbursements/:id/reverse') reverse(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) { return this.relief.reverse(id, body.reason, req.user); }
}

@Controller('beneficiary') @UseGuards(JwtGuard) @Roles('BENEFICIARY')
export class BeneficiaryController {
  constructor(private relief: ReliefService) {}
  @Get('me') me(@Req() req: any) { return this.relief.beneficiaryView(req.user.beneficiaryId); }
}

@Controller('audit') @UseGuards(JwtGuard) @Roles('AUDITOR')
export class AuditController {
  constructor(private db: DatabaseService) {}
  @Get('events') async events(@Query('type') type?: string, @Query('limit') limit = '100') {
    const params: unknown[] = []; let where = ''; if (type) { params.push(type); where = 'WHERE entity_type=$1'; }
    params.push(Math.min(Number(limit) || 100, 500)); const q = await this.db.query(`SELECT * FROM ledger_events ${where} ORDER BY sequence DESC LIMIT $${params.length}`, params); return q.rows;
  }
  @Get('reconciliation') async reconciliation() {
    const q = await this.db.query<any>(`SELECT fs.id,fs.name,fs.source_type,fs.amount_paise,fs.allocated_paise,
      COALESCE(sum(a.disbursed_paise),0) disbursed_paise,COALESCE(sum(a.reserved_paise),0) pending_paise,
      fs.amount_paise-COALESCE(sum(a.disbursed_paise),0)-COALESCE(sum(a.reserved_paise),0) remaining_paise
      FROM fund_sources fs LEFT JOIN allocations a ON a.source_id=fs.id GROUP BY fs.id ORDER BY fs.created_at`); return q.rows.map(numbers);
  }
  @Get('export.csv') @Header('Content-Type', 'text/csv') @Header('Content-Disposition', 'attachment; filename="reliefchain-audit.csv"')
  async csv() {
    const q = await this.db.query<any>(`SELECT d.public_reference,a.district_code,s.name scheme,fs.source_type,d.amount_paise,d.status,d.created_at,d.updated_at,d.proof->>'transactionId' transaction_id
      FROM disbursements d JOIN allocations a ON a.id=d.allocation_id JOIN schemes s ON s.id=a.scheme_id JOIN fund_sources fs ON fs.id=a.source_id ORDER BY d.created_at`);
    const escape = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    return ['public_reference,district_code,scheme,source_type,amount_paise,status,created_at,updated_at,transaction_id', ...q.rows.map((r) => Object.values(r).map(escape).join(','))].join('\n');
  }
}

@Controller('health')
export class HealthController { constructor(private db: DatabaseService) {} @Get() async get() { await this.db.query('SELECT 1'); return { status: 'ok', ledgerMode: process.env.LEDGER_MODE ?? 'memory', timestamp: new Date().toISOString() }; } }
