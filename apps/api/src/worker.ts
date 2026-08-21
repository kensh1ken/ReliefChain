import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ReliefService } from './relief.service';

@Injectable()
export class PayoutWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer?: NodeJS.Timeout; private running = false;
  constructor(private db: DatabaseService, private relief: ReliefService) {}
  onApplicationBootstrap() { this.timer = setInterval(() => void this.tick(), 1000); void this.tick(); }
  onApplicationShutdown() { if (this.timer) clearInterval(this.timer); }
  private async tick() {
    if (this.running) return; this.running = true;
    try {
      const q = await this.db.query<any>('SELECT * FROM payout_jobs WHERE completed_at IS NULL AND run_after<=now() AND attempts<5 ORDER BY run_after LIMIT 5');
      for (const job of q.rows) { try { await this.relief.finalizeJob(job); } catch (error) { await this.db.query("UPDATE payout_jobs SET attempts=attempts+1,last_error=$1,run_after=now()+interval '10 seconds' WHERE id=$2", [error instanceof Error ? error.message : 'Unknown error', job.id]); } }
    } finally { this.running = false; }
  }
}
