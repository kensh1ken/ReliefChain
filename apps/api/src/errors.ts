import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorDetails {
  field?: string;
  message?: string;
  value?: any;
}

export interface StandardError {
  code: string;
  message: string;
  correlationId: string;
  details?: ErrorDetails[];
  timestamp: string;
}

export class ReliefChainException extends HttpException {
  public readonly correlationId: string;
  public readonly details?: ErrorDetails[];

  constructor(
    code: string,
    message: string,
    status: HttpStatus,
    correlationId: string,
    details?: ErrorDetails[]
  ) {
    super(
      {
        code,
        message,
        correlationId,
        details,
        timestamp: new Date().toISOString()
      },
      status
    );
    this.correlationId = correlationId;
    this.details = details;
  }
}

export class BadRequestException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('BAD_REQUEST', message, HttpStatus.BAD_REQUEST, correlationId, details);
  }
}

export class UnauthorizedException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED, correlationId, details);
  }
}

export class ForbiddenException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN, correlationId, details);
  }
}

export class NotFoundException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('NOT_FOUND', message, HttpStatus.NOT_FOUND, correlationId, details);
  }
}

export class ConflictException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('CONFLICT', message, HttpStatus.CONFLICT, correlationId, details);
  }
}

export class ValidationException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, correlationId, details);
  }
}

export class RateLimitException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('RATE_LIMIT_EXCEEDED', message, HttpStatus.TOO_MANY_REQUESTS, correlationId, details);
  }
}

export class ServiceUnavailableException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('SERVICE_UNAVAILABLE', message, HttpStatus.SERVICE_UNAVAILABLE, correlationId, details);
  }
}

export class InternalServerException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('INTERNAL_SERVER_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR, correlationId, details);
  }
}

export class LedgerException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('LEDGER_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR, correlationId, details);
  }
}

export class DatabaseException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('DATABASE_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR, correlationId, details);
  }
}

export class WorkerException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('WORKER_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR, correlationId, details);
  }
}

export class IndexerException extends ReliefChainException {
  constructor(message: string, correlationId: string, details?: ErrorDetails[]) {
    super('INDEXER_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR, correlationId, details);
  }
}
