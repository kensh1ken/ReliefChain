import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { AuditModule } from './audit.module';
import { BeneficiaryModule } from './beneficiary.module';
import { CoreModule } from './core.module';
import { DomainModule } from './domain.module';
import { HealthModule } from './health.module';
import { OperatorModule } from './operator.module';
import { PublicModule } from './public.module';
import { SeedService } from './seed.service';
import { PayoutWorker } from './worker';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { MetricsMiddleware } from './metrics.middleware';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';

@Module({
  imports: [CoreModule, AuthModule, DomainModule, PublicModule, OperatorModule, BeneficiaryModule, AuditModule, HealthModule],
  providers: [
    SeedService,
    PayoutWorker,
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor
    }
  ],
  exports: [SeedService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, MetricsMiddleware)
      .forRoutes('*');
  }
}
