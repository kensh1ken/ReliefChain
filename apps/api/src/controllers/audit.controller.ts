import { Controller, Get, Header, Query, Req, UseGuards, Post, Body, Param, Optional } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { DatabaseService } from '../database.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { RateLimitService } from '../rate-limit.service';
import { LedgerIndexerService } from '../ledger-indexer.service';
import { numbers } from './shared';
import { createHash } from 'node:crypto';
import { Optional } from '@nestjs/common';

@Controller('audit')
@UseGuards(JwtGuard)
@Roles('AUDITOR')
export class AuditController {
  constructor(
    private db: DatabaseService, 
    private ledgerEvents: LedgerRepository, 
    private rateLimit: RateLimitService,
    @Optional() private indexer?: LedgerIndexerService
  ) {}

  @Get('events')
  async events(
    @Query('type') type?: string, 
    @Query('before') before?: string, 
    @Query('limit') limit = '100',
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('transactionId') transactionId?: string,
    @Req() req?: any
  ) {
    await this.rateLimit.check('audit-events', req?.ip ?? 'unknown', Number(process.env.AUDIT_FILTER_RATE_LIMIT ?? 60), 60_000);
    
    // Build filter conditions
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (type) {
      whereClause += ' AND event_name = $' + (params.length + 1);
      params.push(type);
    }
    if (entityType) {
      whereClause += ' AND entity_type = $' + (params.length + 1);
      params.push(entityType);
    }
    if (entityId) {
      whereClause += ' AND entity_id = $' + (params.length + 1);
      params.push(entityId);
    }
    if (transactionId) {
      whereClause += ' AND transaction_id = $' + (params.length + 1);
      params.push(transactionId);
    }
    if (fromDate) {
      whereClause += ' AND committed_at >= $' + (params.length + 1);
      params.push(fromDate);
    }
    if (toDate) {
      whereClause += ' AND committed_at <= $' + (params.length + 1);
      params.push(toDate);
    }
    
    // Apply date range bounds (max 90 days)
    const maxDateRange = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
    if (fromDate && toDate) {
      const from = new Date(fromDate).getTime();
      const to = new Date(toDate).getTime();
      if (to - from > maxDateRange) {
        throw new Error('Date range cannot exceed 90 days');
      }
    }
    
    const page = await this.ledgerEvents.listEvents({ 
      type, 
      beforeSequence: before ? Number(before) : undefined, 
      limit: Math.min(Number(limit) || 100, 500) // Cap at 500
    });
    
    // Apply additional filters to the results
    let filteredItems = page.items;
    if (params.length > 0) {
      filteredItems = page.items.filter(item => {
        if (type && item.event_name !== type) return false;
        if (entityType && item.entity_type !== entityType) return false;
        if (entityId && item.entity_id !== entityId) return false;
        if (transactionId && item.transaction_id !== transactionId) return false;
        if (fromDate && new Date(item.committed_at) < new Date(fromDate)) return false;
        if (toDate && new Date(item.committed_at) > new Date(toDate)) return false;
        return true;
      });
    }
    
    return before ? { ...page, items: filteredItems } : filteredItems;
  }

  @Get('reconciliation')
  async reconciliation(
    @Query('organization') organization?: string,
    @Query('districtCode') districtCode?: string,
    @Query('schemeId') schemeId?: string
  ) {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (organization) {
      whereClause += ' AND fs.owner_msp = $' + (params.length + 1);
      params.push(organization);
    }
    if (districtCode) {
      whereClause += ' AND a.district_code = $' + (params.length + 1);
      params.push(districtCode);
    }
    if (schemeId) {
      whereClause += ' AND a.scheme_id = $' + (params.length + 1);
      params.push(schemeId);
    }
    
    const q = await this.db.query<any>(
      `SELECT fs.id,fs.name,fs.source_type,fs.amount_paise,fs.allocated_paise,fs.owner_msp,
        COALESCE(sum(a.disbursed_paise),0) disbursed_paise,COALESCE(sum(a.reserved_paise),0) pending_paise,
        fs.amount_paise-COALESCE(sum(a.disbursed_paise),0)-COALESCE(sum(a.reserved_paise),0) remaining_paise
        FROM fund_sources fs 
        LEFT JOIN allocations a ON a.source_id=fs.id 
        ${whereClause}
        GROUP BY fs.id 
        ORDER BY fs.created_at`,
      params
    );
    return q.rows.map(numbers);
  }

  @Get('exceptions')
  async exceptions(
    @Query('type') type?: string,
    @Query('thresholdHours') thresholdHours = '24'
  ) {
    const threshold = parseInt(thresholdHours, 10);
    const exceptions: any = {
      stalePendingPayouts: [],
      failedJobs: [],
      projectionLag: null,
      discrepancies: [],
      repeatedReversals: []
    };
    
    // Stale pending payouts (older than threshold)
    const stalePending = await this.db.query<any>(
      `SELECT d.id, d.public_reference, d.amount_paise, d.created_at, 
        EXTRACT(EPOCH FROM (now() - d.created_at))/3600 hours_old
       FROM disbursements d 
       WHERE d.status = 'PENDING' 
       AND d.created_at < now() - interval '${threshold} hours'
       ORDER BY d.created_at ASC
       LIMIT 50`
    );
    exceptions.stalePendingPayouts = stalePending.rows.map(numbers);
    
    // Failed jobs in dead letter
    const failedJobs = await this.db.query<any>(
      `SELECT dl.id, dl.payout_job_id, dl.reason, dl.attempts, dl.created_at,
        d.public_reference, d.amount_paise
       FROM dead_letter_jobs dl
       JOIN payout_jobs pj ON dl.payout_job_id = pj.id
       JOIN disbursements d ON pj.disbursement_id = d.id
       WHERE dl.resolved_at IS NULL
       ORDER BY dl.created_at DESC
       LIMIT 50`
    );
    exceptions.failedJobs = failedJobs.rows.map(numbers);
    
    // Projection lag from indexer
    if (this.indexer) {
      const indexerState = this.indexer.getState();
      exceptions.projectionLag = indexerState.projectionLag;
    } else {
      exceptions.projectionLag = null;
    }
    
    // Discrepancies between ledger and projections (reversals without corresponding settlements)
    const reversals = await this.db.query<any(
      `SELECT d.id, d.public_reference, d.amount_paise, d.status, d.created_at, d.updated_at,
        COUNT(*) OVER (PARTITION BY d.public_reference) reversal_count
       FROM disbursements d
       WHERE d.status = 'REVERSED'
       GROUP BY d.id, d.public_reference, d.amount_paise, d.status, d.created_at, d.updated_at
       HAVING COUNT(*) OVER (PARTITION BY d.public_reference) > 1
       LIMIT 50`
    );
    exceptions.repeatedReversals = reversals.rows.map(numbers);
    
    // Balance discrepancies
    const discrepancies = await this.db.query<any(
      `SELECT fs.id, fs.name, fs.source_type, fs.amount_paise,
        COALESCE(SUM(a.amount_paise), 0) total_allocated,
        COALESCE(SUM(a.disbursed_paise), 0) total_disbursed,
        COALESCE(SUM(a.reserved_paise), 0) total_reserved,
        fs.amount_paise - COALESCE(SUM(a.amount_paise), 0) allocation_mismatch
       FROM fund_sources fs
       LEFT JOIN allocations a ON fs.id = a.source_id
       GROUP BY fs.id, fs.name, fs.source_type, fs.amount_paise
       HAVING ABS(fs.amount_paise - COALESCE(SUM(a.amount_paise), 0)) > 0
       LIMIT 50`
    );
    exceptions.discrepancies = discrepancies.rows.map(numbers);
    
    return exceptions;
  }

  @Get('timeline/:entityId')
  async timeline(
    @Param('entityId') entityId: string,
    @Query('entityType') entityType = 'disbursement'
  ) {
    const timeline: any[] = [];
    
    // Ledger events
    const ledgerEvents = await this.db.query<any>(
      `SELECT 'ledger' as source, event_name, entity_type, entity_id, payload, transaction_id, committed_at
       FROM ledger_events
       WHERE entity_id = $1 AND entity_type = $2
       ORDER BY committed_at ASC`,
      [entityId, entityType]
    );
    timeline.push(...ledgerEvents.rows.map(numbers));
    
    // Application audit actions
    const auditActions = await this.db.query<any(
      `SELECT 'application' as source, action, resource_type, resource_id, details, created_at
       FROM api_audit_actions
       WHERE resource_id = $1 AND resource_type = $2
       ORDER BY created_at ASC`,
      [entityId, entityType]
    );
    timeline.push(...auditActions.rows.map(numbers));
    
    // Payout attempts for disbursements
    if (entityType === 'disbursement') {
      const payoutAttempts = await this.db.query<any>(
        `SELECT 'payout' as source, attempt_number, status, provider_reference, error_code, error_message, completed_at
         FROM payout_attempts
         WHERE disbursement_id = $1
         ORDER BY attempt_number ASC`,
        [entityId]
      );
      timeline.push(...payoutAttempts.rows.map(numbers));
      
      // Status history
      const statusHistory = await this.db.query<any>(
        `SELECT 'status' as source, from_status, to_status, reason, metadata, created_at
         FROM disbursement_status_history
         WHERE disbursement_id = $1
         ORDER BY created_at ASC`,
        [entityId]
      );
      timeline.push(...statusHistory.rows.map(numbers));
    }
    
    // Investigation annotations
    const annotations = await this.db.query<any>(
      `SELECT 'annotation' as source, note, case_status, auditor_id, created_at, updated_at
       FROM audit_annotations
       WHERE entity_id = $1 AND entity_type = $2
       ORDER BY created_at ASC`,
      [entityId, entityType]
    );
    timeline.push(...annotations.rows.map(numbers));
    
    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    return timeline;
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="reliefchain-audit.csv"')
  async csv(
    @Req() req: any,
    @Query('disasterId') disasterId?: string,
    @Query('districtCode') districtCode?: string,
    @Query('schemeId') schemeId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('organization') organization?: string
  ) {
    await this.rateLimit.check('audit-export', req.ip ?? 'unknown', Number(process.env.AUDIT_EXPORT_RATE_LIMIT ?? 10), 60_000);
    
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
    if (organization) {
      whereClause += ' AND fs.owner_msp = $' + (params.length + 1);
      params.push(organization);
    }
    
    const q = await this.db.query<any>(
      `SELECT d.public_reference,a.district_code,s.name scheme,fs.source_type,d.amount_paise,d.status,d.created_at,d.updated_at,
        d.proof->>'transactionId' transaction_id, fs.owner_msp
      FROM disbursements d 
      JOIN allocations a ON a.id=d.allocation_id 
      JOIN schemes s ON s.id=a.scheme_id 
      JOIN fund_sources fs ON fs.id=a.source_id
      JOIN disasters dis ON fs.disaster_id = dis.id
      ${whereClause}
      ORDER BY d.created_at`,
      params
    );
    
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csvRows = q.rows.map((row) => Object.values(row).map(escape).join(','));
    
    // Generate manifest
    const manifest = {
      exportedAt: new Date().toISOString(),
      filters: { disasterId, districtCode, schemeId, status, fromDate, toDate, organization },
      rowCount: q.rowCount,
      contentHash: createHash('sha256').update(csvRows.join('\n')).digest('hex')
    };
    
    return [
      '# MANIFEST: ' + JSON.stringify(manifest),
      'public_reference,district_code,scheme,source_type,amount_paise,status,created_at,updated_at,transaction_id,owner_msp',
      ...csvRows
    ].join('\n');
  }

  @Get('export.json')
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="reliefchain-audit.json"')
  async jsonExport(
    @Req() req: any,
    @Query('disasterId') disasterId?: string,
    @Query('districtCode') districtCode?: string,
    @Query('schemeId') schemeId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('organization') organization?: string
  ) {
    await this.rateLimit.check('audit-export', req.ip ?? 'unknown', Number(process.env.AUDIT_EXPORT_RATE_LIMIT ?? 10), 60_000);
    
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
    if (organization) {
      whereClause += ' AND fs.owner_msp = $' + (params.length + 1);
      params.push(organization);
    }
    
    const q = await this.db.query<any>(
      `SELECT d.public_reference,a.district_code,s.name scheme,fs.source_type,d.amount_paise,d.status,d.created_at,d.updated_at,
        d.proof->>'transactionId' transaction_id, fs.owner_msp
      FROM disbursements d 
      JOIN allocations a ON a.id=d.allocation_id 
      JOIN schemes s ON s.id=a.scheme_id 
      JOIN fund_sources fs ON fs.id=a.source_id
      JOIN disasters dis ON fs.disaster_id = dis.id
      ${whereClause}
      ORDER BY d.created_at`,
      params
    );
    
    const data = q.rows.map(numbers);
    const contentHash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    
    return {
      manifest: {
        exportedAt: new Date().toISOString(),
        filters: { disasterId, districtCode, schemeId, status, fromDate, toDate, organization },
        rowCount: q.rowCount,
        contentHash
      },
      data
    };
  }

  @Post('annotations')
  async createAnnotation(
    @Body() body: { entityType: string; entityId: string; note: string; caseStatus?: string },
    @Req() req: any
  ) {
    const result = await this.db.query<any>(
      `INSERT INTO audit_annotations (auditor_id, entity_type, entity_id, note, case_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())
       RETURNING *`,
      [req.user.sub, body.entityType, body.entityId, body.note, body.caseStatus || 'OPEN']
    );
    return result.rows[0];
  }

  @Get('annotations/:entityType/:entityId')
  async getAnnotations(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string
  ) {
    const result = await this.db.query<any>(
      `SELECT * FROM audit_annotations
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entityType, entityId]
    );
    return result.rows;
  }

  @Post('annotations/:id/resolve')
  async resolveAnnotation(
    @Param('id') id: string,
    @Body() body: { resolution: string; caseStatus: string },
    @Req() req: any
  ) {
    const result = await this.db.query<any(
      `UPDATE audit_annotations
       SET case_status = $1, note = note || ' | ' || $2, updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [body.caseStatus, body.resolution, id]
    );
    if (!result.rowCount) throw new Error('Annotation not found');
    return result.rows[0];
  }
}
