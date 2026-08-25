import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { CoreModule } from './core.module';

@Module({ 
	imports: [CoreModule], 
	controllers: [HealthController]
})
export class HealthModule {}