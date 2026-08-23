import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';

@Injectable()
export class ProjectionRepository {
  constructor(private db: DatabaseService) {}

  async resetFromBlock(blockNumber = 0) {
    return this.db.transaction(async (client) => {
      await client.query('TRUNCATE TABLE ledger_events RESTART IDENTITY');
      await client.query('UPDATE indexer_checkpoint SET block_number=$1,updated_at=now() WHERE id=1', [blockNumber]);
    });
  }

  async checkpoint() {
    const result = await this.db.query('SELECT block_number,updated_at FROM indexer_checkpoint WHERE id=1');
    return result.rows[0] ?? null;
  }
}