import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';

export interface LedgerEventPage {
  type?: string;
  beforeSequence?: number;
  limit?: number;
}

@Injectable()
export class LedgerRepository {
  constructor(private db: DatabaseService) {}

  async listEvents(options: LedgerEventPage = {}) {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (options.type) { params.push(options.type); clauses.push(`entity_type=$${params.length}`); }
    if (options.beforeSequence != null) { params.push(options.beforeSequence); clauses.push(`sequence<$${params.length}`); }
    params.push(limit);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.db.query(`SELECT * FROM ledger_events ${where} ORDER BY sequence DESC LIMIT $${params.length}`, params);
    return { items: result.rows, nextBeforeSequence: result.rows.length === limit ? result.rows[result.rows.length - 1].sequence : null };
  }
}