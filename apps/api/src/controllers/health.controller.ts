import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database.service';

@Controller('health')
export class HealthController {
	constructor(private db: DatabaseService) {}
	@Get() async get() { await this.db.query('SELECT 1'); return { status: 'ok', ledgerMode: process.env.LEDGER_MODE ?? 'memory', timestamp: new Date().toISOString() }; }
}