import { describe, expect, it } from 'vitest';
import { migrations, runMigrations } from './runner';

function fakePool(appliedIds: string[] = []) {
  const queries: string[] = [];
  const client = {
    query: async (sql: string, values?: unknown[]) => {
      queries.push(sql);
      if (sql.includes('SELECT 1 FROM schema_migrations')) return { rowCount: appliedIds.includes(String(values?.[0])) ? 1 : 0, rows: [] };
      return { rowCount: 0, rows: [] };
    },
    release: () => undefined
  };
  return { connect: async () => client, queries } as any;
}

describe('migration runner', () => {
  it('applies every migration in order for an empty database', async () => {
    const pool = fakePool();
    await runMigrations(pool);
    expect(pool.queries.filter((query: string) => query.includes('INSERT INTO schema_migrations'))).toHaveLength(migrations.length);
    expect(pool.queries.findIndex((query: string) => query === migrations[0].up)).toBeLessThan(pool.queries.findIndex((query: string) => query === migrations[1].up));
    expect(pool.queries.at(-1)).toBe('COMMIT');
    expect(migrations.map((item) => item.id)).toEqual([
      '001_initial', '002_integrity_indexes', '003_operational_persistence', '004_session_subjects',
      '005_rate_limits', '006_disbursement_orchestration', '007_status_history',
      '008_worker_leasing', '009_indexer_enhancements', '010_correlation_id_tracking',
      '011_payout_job_status_default'
    ]);
  });

  it('skips migrations already recorded in schema_migrations', async () => {
    const pool = fakePool(migrations.map((item) => item.id));
    await runMigrations(pool);
    expect(pool.queries.filter((query: string) => query === migrations[0].up)).toHaveLength(0);
    expect(pool.queries.at(-1)).toBe('COMMIT');
  });
});
