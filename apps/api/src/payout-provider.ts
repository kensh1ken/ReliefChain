export const PAYOUT_PROVIDER = Symbol('PAYOUT_PROVIDER');

export type ProviderStatus = 'SETTLED' | 'FAILED' | 'UNKNOWN';
export interface ProviderResult { status: ProviderStatus; providerReference: string | null; errorCode: string | null; errorMessage: string | null }
export interface PayoutProvider { submit(input: { disbursementId: string; amountPaise: number; requestedOutcome: ProviderStatus; correlationId?: string }): Promise<ProviderResult>; reconcile(providerReference: string): Promise<ProviderResult> }