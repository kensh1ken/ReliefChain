const sensitiveKeys = new Set([
  'aadhaar', 'name', 'phone', 'otp', 'password', 'password_hash', 
  'bankAccount', 'accountNumber', 'encryptionKey', 'jwtSecret', 'beneficiaryRef',
  'secret', 'token', 'apiKey', 'accessToken', 'refreshToken', 'privateKey',
  'authorization', 'cookie', 'session', 'creditCard', 'ssn', 'email',
  'address', 'pin', 'cvv', 'cardNumber', 'routingNumber', 'ifsc'
]);

const sensitivePatterns = [
  /(?<![\d-])\d{12}(?![\d-])/g, // Standalone Aadhaar-like numbers, but not UUID segments
  /(?<![\d-])\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}(?![\d-])/g, // Standalone card numbers
  /(?<![\d-])\d{3}-\d{2}-\d{4}(?![\d-])/g, // Standalone SSN-like numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  /\+91[- ]?\d{10}\b/g, // Indian phone numbers with country code
  /(?<![\d-])\d{10}(?![\d-])/g, // Standalone local phone numbers, but not UUID segments
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, // Bearer tokens
  /sk-[a-zA-Z0-9]{32,}/g, // API keys
];

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (typeof value === 'string') return redactString(value);
  if (!value || typeof value !== 'object') return value;
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
  
  const logEntry: any = {
    timestamp,
    level,
    message
  };
  
  // Add context fields individually
  if (safeContext && typeof safeContext === 'object') {
    Object.entries(safeContext).forEach(([key, value]) => {
      logEntry[key] = value;
    });
  }
  
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
