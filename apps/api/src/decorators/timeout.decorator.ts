import { applyDecorators, SetMetadata } from '@nestjs/common';

export const TIMEOUT_KEY = 'timeout';

export function Timeout(ms: number) {
  return applyDecorators(
    SetMetadata(TIMEOUT_KEY, ms)
  );
}

export const REQUEST_SIZE_LIMIT_KEY = 'requestSizeLimit';

export function RequestSizeLimit(maxSizeMB: number) {
  return applyDecorators(
    SetMetadata(REQUEST_SIZE_LIMIT_KEY, maxSizeMB)
  );
}

export const QUERY_LIMIT_KEY = 'queryLimit';

export function QueryLimit(maxLimit: number) {
  return applyDecorators(
    SetMetadata(QUERY_LIMIT_KEY, maxLimit)
  );
}
