import type { SessionUser } from './auth';
import { Injectable } from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { DisbursementsService } from './disbursements.service';
import { FundsService } from './funds.service';
import { PayoutsService } from './payouts.service';

@Injectable()
export class ReliefService {
  constructor(private funds: FundsService, private beneficiaries: BeneficiariesService, private disbursements: DisbursementsService, private payouts: PayoutsService) {}

  createFundSource(input: any, user: SessionUser) { return this.funds.createFundSource(input, user); }
  allocate(input: any, user: SessionUser) { return this.funds.allocate(input, user); }
  registerBeneficiary(input: any, user: SessionUser) { return this.beneficiaries.registerBeneficiary(input, user); }
  initiateDisbursement(input: any, user: SessionUser) { return this.disbursements.initiate(input, user); }
  finalizeJob(job: any) { return this.payouts.finalizeJob(job); }
  reverse(id: string, reason: string, user: SessionUser) { return this.disbursements.reverse(id, reason, user); }
  beneficiaryView(id: string) { return this.beneficiaries.view(id); }
  createBatch(user: SessionUser) { return this.disbursements.createBatch(user); }
  requestBatchApproval(id: string, user: SessionUser) { return this.disbursements.requestBatchApproval(id, user); }
  approveBatch(id: string, user: SessionUser) { return this.disbursements.approveBatch(id, user); }
  submitBatch(id: string, user: SessionUser) { return this.disbursements.submitBatch(id, user); }
  reconcileDisbursement(id: string, providerReference: string, user: SessionUser) { return this.payouts.reconcile(id, providerReference, user); }
}

// Legacy compatibility: the worker now uses PayoutsService directly
export { PayoutsService };
