import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MetricsMiddleware.name);

  constructor(private metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const correlationId = req['correlationId'] || 'unknown';

    // Hook into response finish event
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const method = req.method;
      const path = req.path;

      // Record metrics
      this.metrics.recordApiRequest(method, path, statusCode, duration);

      // Log slow requests (> 1 second)
      if (duration > 1000) {
        this.logger.warn(
          `Slow request detected: ${method} ${path} took ${duration}ms [correlation: ${correlationId}]`
        );
      }

      // Log errors
      if (statusCode >= 500) {
        this.logger.error(
          `Server error: ${method} ${path} returned ${statusCode} [correlation: ${correlationId}]`
        );
      }
    });

    next();
  }
}
