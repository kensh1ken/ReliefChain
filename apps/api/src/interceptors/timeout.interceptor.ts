import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Logger
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { TIMEOUT_KEY } from '../decorators/timeout.decorator';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly defaultTimeout = 30000; // 30 seconds default

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const correlationId = request['correlationId'] || 'unknown';
    
    // Get timeout from decorator or use default
    const timeoutMs = Reflect.getMetadata(TIMEOUT_KEY, handler) || this.defaultTimeout;
    
    this.logger.debug(
      `Setting timeout of ${timeoutMs}ms for ${request.method} ${request.path} [correlation: ${correlationId}]`
    );

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) => {
        // Check if it's a timeout error by examining the error properties
        if (err && err.name === 'TimeoutError' || err.message?.includes('timeout')) {
          this.logger.warn(
            `Request timeout: ${request.method} ${request.path} exceeded ${timeoutMs}ms [correlation: ${correlationId}]`
          );
          return throwError(() => new RequestTimeoutException(`Request timeout after ${timeoutMs}ms`));
        }
        return throwError(() => err);
      })
    );
  }
}
