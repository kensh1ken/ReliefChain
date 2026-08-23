import { Module } from '@nestjs/common';
import { LedgerService } from './ledger';
import { BeneficiariesService } from './beneficiaries.service';
import { DisbursementsService } from './disbursements.service';
import { FundsService } from './funds.service';
import { PayoutsService } from './payouts.service';
import { ReliefService } from './relief.service';
import { LEDGER_PORT } from './ports';
import { PAYOUT_PROVIDER } from './payout-provider';
import { SimulatedPayoutProvider } from './simulated-payout.provider';

@Module({
  providers: [
    { provide: LEDGER_PORT, useExisting: LedgerService },
    SimulatedPayoutProvider, { provide: PAYOUT_PROVIDER, useExisting: SimulatedPayoutProvider },
    FundsService, BeneficiariesService, DisbursementsService, PayoutsService, ReliefService
  ],
  exports: [FundsService, BeneficiariesService, DisbursementsService, PayoutsService, ReliefService]
})
export class DomainModule {}