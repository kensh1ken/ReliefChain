import { afterEach, describe, expect, it } from 'vitest';
import { SimulatedPayoutProvider } from './simulated-payout.provider';

const originalNodeEnv = process.env.NODE_ENV;
afterEach(() => { process.env.NODE_ENV = originalNodeEnv; });

describe('simulated payout provider', () => {
  it('returns stable simulated terminal outcomes and unknown timeouts', async () => {
    const provider = new SimulatedPayoutProvider();
    expect((await provider.submit({ disbursementId: 'd', amountPaise: 10, requestedOutcome: 'SETTLED' })).providerReference).toMatch(/^SIMBANK-/);
    expect(await provider.submit({ disbursementId: 'd', amountPaise: 10, requestedOutcome: 'UNKNOWN' })).toMatchObject({ status: 'UNKNOWN', errorCode: 'PROVIDER_TIMEOUT' });
  });
  it('refuses simulated payouts in production', async () => {
    process.env.NODE_ENV = 'production';
    await expect(new SimulatedPayoutProvider().submit({ disbursementId: 'd', amountPaise: 10, requestedOutcome: 'SETTLED' })).rejects.toThrow('outside production');
  });
});