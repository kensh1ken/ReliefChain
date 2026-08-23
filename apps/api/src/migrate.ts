import 'dotenv/config';
import { Pool } from 'pg';
import { runMigrations } from './migrations/runner';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await runMigrations(pool);
    console.log('Database migrations applied');
  } finally {
    await pool.end();
  }
}

void main();