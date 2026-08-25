import { Controller, Get, Optional } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { LedgerIndexerService } from '../ledger-indexer.service';
import { MetricsService } from '../metrics.service';

@Controller('health')
export class HealthController {
	constructor(
		private db: DatabaseService, 
		@Optional() private indexer?: LedgerIndexerService,
		@Optional() private metricsService?: MetricsService
	) {}
	
	@Get() async get() { 
		return await this.getHealthStatus();
	}
	
	@Get('live') async liveness() {
		// Simple liveness check - is the process running?
		return {
			status: 'alive',
			timestamp: new Date().toISOString()
		};
	}
	
	@Get('ready') async readiness() {
		const checks = {
			database: 'unknown',
			ledger: 'unknown',
			worker: 'unknown',
			indexer: 'unknown'
		};
		
		// Check database
		try {
			await this.db.query('SELECT 1');
			checks.database = 'ready';
		} catch (error) {
			checks.database = 'not_ready';
		}
		
		// Check ledger (Fabric connection)
		try {
			// Simple check - if ledger mode is fabric, we assume gateway is initialized
			if (process.env.LEDGER_MODE === 'fabric') {
				checks.ledger = 'ready';
			} else {
				checks.ledger = 'ready'; // Memory mode is always ready
			}
		} catch (error) {
			checks.ledger = 'not_ready';
		}
		
		// Check worker
		if (process.env.WORKER_ENABLED === 'true') {
			checks.worker = 'ready';
		} else {
			checks.worker = 'not_configured';
		}
		
		// Check indexer
		if (this.indexer && process.env.LEDGER_MODE === 'fabric') {
			checks.indexer = 'ready';
		} else {
			checks.indexer = 'not_configured';
		}
		
		const allReady = Object.values(checks).every(status => 
			status === 'ready' || status === 'not_configured'
		);
		
		return {
			status: allReady ? 'ready' : 'not_ready',
			checks,
			timestamp: new Date().toISOString()
		};
	}
	
	@Get('detailed') async detailed() {
		const health = await this.getHealthStatus();
		
		// Add metrics if available
		if (this.metricsService) {
			health.metrics = this.metricsService.getSystemHealth();
		}
		
		return health;
	}
	
	@Get('metrics') async metrics() {
		if (!this.metricsService) {
			return { error: 'Metrics service not available' };
		}
		
		return {
			timestamp: new Date().toISOString(),
			health: this.metricsService.getSystemHealth(),
			allMetrics: this.metricsService.getAllMetrics()
		};
	}
	
	private async getHealthStatus() {
		const health: any = {
			status: 'ok',
			timestamp: new Date().toISOString(),
			components: {
				database: 'unknown',
				ledger: 'unknown',
				worker: 'unknown',
				indexer: 'unknown'
			}
		};
		
		// Database health
		try {
			const startTime = Date.now();
			await this.db.query('SELECT 1');
			const duration = Date.now() - startTime;
			health.components.database = {
				status: 'healthy',
				latency_ms: duration
			};
		} catch (error) {
			health.status = 'degraded';
			health.components.database = {
				status: 'unhealthy',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
		
		// Ledger health
		health.ledgerMode = process.env.LEDGER_MODE ?? 'memory';
		if (process.env.LEDGER_MODE === 'fabric') {
			health.components.ledger = {
				status: 'configured',
				mode: 'fabric'
			};
		} else {
			health.components.ledger = {
				status: 'configured',
				mode: 'memory'
			};
		}
		
		// Worker health
		if (process.env.WORKER_ENABLED === 'true') {
			health.components.worker = {
				status: 'configured',
				enabled: true
			};
		} else {
			health.components.worker = {
				status: 'not_configured',
				enabled: false
			};
		}
		
		// Indexer health
		if (this.indexer && process.env.LEDGER_MODE === 'fabric') {
			try {
				const indexerHealth = await this.indexer.getHealthStatus();
				health.components.indexer = {
					status: indexerHealth.indexerActive ? 'healthy' : 'inactive',
					...indexerHealth
				};
			} catch (error) {
				health.status = 'degraded';
				health.components.indexer = {
					status: 'unhealthy',
					error: error instanceof Error ? error.message : 'Unknown error'
				};
			}
		} else {
			health.components.indexer = {
				status: 'not_configured',
				reason: process.env.LEDGER_MODE === 'fabric' ? 'Indexer not available' : 'Indexer disabled in memory mode'
			};
		}
		
		// Migration status
		try {
			const migrationCheck = await this.db.query(
				'SELECT COUNT(*) as count FROM schema_migrations'
			);
			health.components.migrations = {
				status: 'healthy',
				migrations_applied: parseInt(migrationCheck.rows[0].count, 10)
			};
		} catch (error) {
			health.components.migrations = {
				status: 'unknown',
				error: 'Migration table not found or query failed'
			};
		}
		
		return health;
	}
}