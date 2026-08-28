export type ReconciliationRecord = {
  id: string;
  name: string;
  source_type: string;
  amount_paise: number;
  allocated_paise: number;
  disbursed_paise: number;
  pending_paise: number;
  remaining_paise: number;
  owner_msp?: string;
};

export type AuditEvent = {
  sequence: number;
  event_name: string;
  entity_type: string;
  entity_id: string;
  transaction_id: string;
  committed_at: string;
  block_number?: number;
};

export type AuditExceptions = {
  stalePendingPayouts: unknown[];
  failedJobs: unknown[];
  projectionLag: number | null;
  discrepancies: unknown[];
  repeatedReversals: unknown[];
};
