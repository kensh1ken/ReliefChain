import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Get correlation ID from header or generate new one
    const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
    
    // Set correlation ID on request and response
    req['correlationId'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Log request with correlation ID
    this.logger.debug(
      `${req.method} ${req.path} - Correlation ID: ${correlationId}`
    );
    
    next();
  }
}
