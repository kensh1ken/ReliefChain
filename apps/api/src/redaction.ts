const sensitiveKeys = new Set([
  'aadhaar', 'name', 'phone', 'otp', 'password', 'password_hash', 
  'bankAccount', 'accountNumber', 'encryptionKey', 'jwtSecret', 'beneficiaryRef',
  'secret', 'token', 'apiKey', 'accessToken', 'refreshToken', 'privateKey',
  'authorization', 'cookie', 'session', 'creditCard', 'ssn', 'email',
  'address', 'pin', 'cvv', 'cardNumber', 'routingNumber', 'ifsc'
]);

const sensitivePatterns = [
  /\b\d{12}\b/g, // Aadhaar-like numbers
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit card numbers
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN-like numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  /\+?\d{1,3}[- ]?\d{10}\b/g, // Phone numbers
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, // Bearer tokens
  /sk-[a-zA-Z0-9]{32,}/g, // API keys
];

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== 'object') return redactString(String(value));
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
    key, 
    sensitiveKeys.has(key.toLowerCase()) ? '[REDACTED]' : redactSensitive(nested)
  ]));
}

function redactString(value: string): string {
  let redacted = value;
  for (const pattern of sensitivePatterns) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestPath?: string;
  requestMethod?: string;
  clientIp?: string;
  [key: string]: any;
}

export function formatLog(level: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const safeContext = context ? redactSensitive(context) : {};
  
  const logEntry = {
    timestamp,
    level,
    message,
    ...safeContext
  };
  
  return JSON.stringify(logEntry);
}

export class StructuredLogger {
  private context: LogContext = {};

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  debug(message: string, context?: LogContext) {
    const mergedContext = { ...this.context, ...context };
    console.log(formatLog('debug', message, mergedContext));
  }

  info(message: string, context?: LogContext) {
    const mergedContext = { ...this.context, ...context };
    console.log(formatLog('info', message, mergedContext));
  }

  warn(message: string, context?: LogContext) {
    const mergedContext = { ...this.context, ...context };
    console.warn(formatLog('warn', message, mergedContext));
  }

  error(message: string, error?: Error, context?: LogContext) {
    const mergedContext = { 
      ...this.context, 
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };
    console.error(formatLog('error', message, mergedContext));
  }
}

export const logger = new StructuredLogger();