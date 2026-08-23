import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { runMigrations } from './migrations/runner';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  async onModuleInit() { await runMigrations(this.pool); }
  async onApplicationShutdown() { await this.pool.end(); }
  query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) { return this.pool.query<T>(text, values); }
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const value = await work(client); await client.query('COMMIT'); return value; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}
