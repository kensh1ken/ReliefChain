import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PayoutProvider, ProviderResult } from './payout-provider';

@Injectable()
export class SimulatedPayoutProvider implements PayoutProvider {
  private results = new Map<string, ProviderResult>();
  async submit(input: { disbursementId: string; amountPaise: number; requestedOutcome: ProviderResult['status']; correlationId?: string }): Promise<ProviderResult> {
    if (process.env.NODE_ENV === 'production') throw new Error('Simulated payout provider is available only outside production');
    const providerReference = `SIMBANK-${randomUUID().slice(0, 12).toUpperCase()}`;
    const result: ProviderResult = input.requestedOutcome === 'UNKNOWN'
      ? { status: 'UNKNOWN', providerReference, errorCode: 'PROVIDER_TIMEOUT', errorMessage: 'Simulated provider timeout' }
      : { status: input.requestedOutcome, providerReference, errorCode: input.requestedOutcome === 'FAILED' ? 'BANK_REJECTED' : null, errorMessage: input.requestedOutcome === 'FAILED' ? 'Simulated bank rejection' : null };
    this.results.set(providerReference, { ...result, status: input.requestedOutcome === 'UNKNOWN' ? 'SETTLED' : result.status, errorCode: input.requestedOutcome === 'UNKNOWN' ? null : result.errorCode, errorMessage: input.requestedOutcome === 'UNKNOWN' ? null : result.errorMessage });
    return result;
  }
  async reconcile(providerReference: string) {
    return this.results.get(providerReference) ?? { status: 'UNKNOWN', providerReference, errorCode: 'PROVIDER_NOT_FOUND', errorMessage: 'Provider reference not found' };
  }
}