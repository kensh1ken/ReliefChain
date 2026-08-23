import { createHash } from 'node:crypto';
import { HttpException, Injectable, HttpStatus } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class RateLimitService {
  constructor(private db: DatabaseService) {}

  async check(bucket: string, key: string, limit: number, windowMs: number) {
    const keyHash = createHash('sha256').update(key).digest('hex');
    const result = await this.db.query<{ request_count: number }>(`INSERT INTO rate_limit_buckets(bucket,key_hash,window_started_at,request_count)
      VALUES($1,$2,now(),1) ON CONFLICT(bucket,key_hash) DO UPDATE SET
      request_count=CASE WHEN rate_limit_buckets.window_started_at <= now()-($3 || ' milliseconds')::interval THEN 1 ELSE rate_limit_buckets.request_count+1 END,
      window_started_at=CASE WHEN rate_limit_buckets.window_started_at <= now()-($3 || ' milliseconds')::interval THEN now() ELSE rate_limit_buckets.window_started_at END
      RETURNING request_count`, [bucket, keyHash, windowMs]);
    if (Number(result.rows[0]?.request_count) > limit) throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
  }
}