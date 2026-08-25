import type { Pool } from 'pg';
import { migration } from './001_initial';
import { migration as integrityIndexesMigration } from './002_integrity_indexes';
import { migration as operationalPersistenceMigration } from './003_operational_persistence';
import { migration as sessionSubjectsMigration } from './004_session_subjects';
import { migration as rateLimitsMigration } from './005_rate_limits';
import { migration as orchestrationMigration } from './006_disbursement_orchestration';
import { migration as statusHistoryMigration } from './007_status_history';
import { migration as workerLeasingMigration } from './008_worker_leasing';
import { migration as indexerEnhancementsMigration } from './009_indexer_enhancements';
import { migration as correlationIdTrackingMigration } from './010_correlation_id_tracking';
import { migration as payoutJobStatusDefaultMigration } from './011_payout_job_status_default';

export const migrations = [
  migration,
  integrityIndexesMigration,
  operationalPersistenceMigration,
  sessionSubjectsMigration,
  rateLimitsMigration,
  orchestrationMigration,
  statusHistoryMigration,
  workerLeasingMigration,
  indexerEnhancementsMigration,
  correlationIdTrackingMigration,
  payoutJobStatusDefaultMigration
];

export async function runMigrations(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [841927]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    for (const item of migrations) {
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE id=$1', [item.id]);
      if (!applied.rowCount) {
        await client.query(item.up);
        await client.query('INSERT INTO schema_migrations(id) VALUES($1)', [item.id]);
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
