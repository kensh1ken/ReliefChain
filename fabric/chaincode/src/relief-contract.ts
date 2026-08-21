import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { AllocationAsset, DisbursementAsset, FundSourceAsset, allocate, reserve, reverse, settle } from './domain';

type Json = object;

@Info({ title: 'ReliefFundsContract', description: 'Privacy-preserving disaster relief fund ledger' })
export class ReliefFundsContract extends Contract {
  private key(type: string, id: string) { return `${type}:${id}`; }
  private now(ctx: Context) {
    const stamp = ctx.stub.getTxTimestamp();
    return new Date(Number(stamp.seconds) * 1000 + Math.floor(stamp.nanos / 1_000_000)).toISOString();
  }
  private async get<T>(ctx: Context, key: string): Promise<T> {
    const bytes = await ctx.stub.getState(key);
    if (!bytes?.length) throw new Error(`${key} does not exist`);
    return JSON.parse(bytes.toString()) as T;
  }
  private async put(ctx: Context, key: string, value: unknown) {
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(value)));
  }
  private requireWriter(ctx: Context) {
    const msp = ctx.clientIdentity.getMSPID();
    const role = ctx.clientIdentity.getAttributeValue('role') ?? (msp === 'GovernmentMSP' ? 'GOVERNMENT' : msp === 'NgoMSP' ? 'NGO' : null);
    if (!['GOVERNMENT', 'NGO'].includes(role ?? '')) throw new Error('Writer identity required');
    return { role: role!, msp };
  }
  private emit(ctx: Context, name: string, payload: Json) {
    ctx.stub.setEvent(name, Buffer.from(JSON.stringify({ ...payload, transactionId: ctx.stub.getTxID(), committedAt: this.now(ctx) })));
  }

  @Transaction()
  async RegisterDisaster(ctx: Context, id: string, name: string, stateCode: string): Promise<string> {
    this.requireWriter(ctx);
    const key = this.key('disaster', id);
    if ((await ctx.stub.getState(key)).length) throw new Error('Disaster already exists');
    const asset = { docType: 'disaster', id, name, stateCode, createdAt: this.now(ctx) };
    await this.put(ctx, key, asset); this.emit(ctx, 'DisasterRegistered', asset); return JSON.stringify(asset);
  }

  @Transaction()
  async RegisterScheme(ctx: Context, id: string, disasterId: string, name: string): Promise<string> {
    this.requireWriter(ctx); await this.get(ctx, this.key('disaster', disasterId));
    const key = this.key('scheme', id);
    if ((await ctx.stub.getState(key)).length) throw new Error('Scheme already exists');
    const asset = { docType: 'scheme', id, disasterId, name, createdAt: this.now(ctx) };
    await this.put(ctx, key, asset); this.emit(ctx, 'SchemeRegistered', asset); return JSON.stringify(asset);
  }

  @Transaction()
  async CreateFundSource(ctx: Context, id: string, disasterId: string, sourceType: string, name: string, amountPaiseRaw: string) {
    const actor = this.requireWriter(ctx); await this.get(ctx, this.key('disaster', disasterId));
    if (actor.role === 'NGO' && sourceType !== 'NGO') throw new Error('NGO identities can only create NGO sources');
    const amountPaise = Number(amountPaiseRaw);
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) throw new Error('Invalid amount');
    const key = this.key('source', id); if ((await ctx.stub.getState(key)).length) throw new Error('Source already exists');
    const asset: FundSourceAsset = { docType: 'fundSource', id, ownerMsp: actor.msp, sourceType, name, disasterId, amountPaise, allocatedPaise: 0, createdAt: this.now(ctx) };
    await this.put(ctx, key, asset); this.emit(ctx, 'FundSourceCreated', asset); return JSON.stringify(asset);
  }

  @Transaction()
  async AllocateFunds(ctx: Context, id: string, sourceId: string, schemeId: string, districtCode: string, amountRaw: string) {
    const actor = this.requireWriter(ctx);
    const sourceKey = this.key('source', sourceId), source = await this.get<FundSourceAsset>(ctx, sourceKey);
    await this.get(ctx, this.key('scheme', schemeId));
    const key = this.key('allocation', id); if ((await ctx.stub.getState(key)).length) throw new Error('Allocation already exists');
    const amountPaise = Number(amountRaw), updated = allocate(source, amountPaise, actor.msp);
    const asset: AllocationAsset = { docType: 'allocation', id, sourceId, ownerMsp: actor.msp, schemeId, districtCode, amountPaise, disbursedPaise: 0, reservedPaise: 0, createdAt: this.now(ctx) };
    await this.put(ctx, sourceKey, updated); await this.put(ctx, key, asset); this.emit(ctx, 'FundsAllocated', asset); return JSON.stringify(asset);
  }

  @Transaction()
  async RegisterBeneficiaryCommitment(ctx: Context, beneficiaryRef: string, districtCode: string, schemeId: string) {
    this.requireWriter(ctx); await this.get(ctx, this.key('scheme', schemeId));
    const key = this.key('beneficiary', beneficiaryRef); if ((await ctx.stub.getState(key)).length) throw new Error('Beneficiary commitment already exists');
    const asset = { docType: 'beneficiaryCommitment', beneficiaryRef, districtCode, schemeId, createdAt: this.now(ctx) };
    await this.put(ctx, key, asset); this.emit(ctx, 'BeneficiaryCommitted', asset); return JSON.stringify(asset);
  }

  @Transaction()
  async InitiateDisbursement(ctx: Context, id: string, publicReference: string, allocationId: string, beneficiaryRef: string, amountRaw: string, idempotencyKey: string) {
    const actor = this.requireWriter(ctx);
    const idemKey = this.key('idempotency', idempotencyKey); if ((await ctx.stub.getState(idemKey)).length) throw new Error('Duplicate idempotency key');
    await this.get(ctx, this.key('beneficiary', beneficiaryRef));
    const allocationKey = this.key('allocation', allocationId), allocation = await this.get<AllocationAsset>(ctx, allocationKey);
    const amountPaise = Number(amountRaw), updated = reserve(allocation, amountPaise, actor.msp), now = this.now(ctx);
    const asset: DisbursementAsset = { docType: 'disbursement', id, publicReference, allocationId, beneficiaryRef, amountPaise, status: 'PENDING', idempotencyKey, createdAt: now, updatedAt: now };
    await this.put(ctx, allocationKey, updated); await this.put(ctx, this.key('disbursement', id), asset); await this.put(ctx, idemKey, { id });
    this.emit(ctx, 'DisbursementInitiated', { ...asset, beneficiaryRef: undefined }); return JSON.stringify(asset);
  }

  @Transaction()
  async FinalizeDisbursement(ctx: Context, id: string, status: string, bankReference: string, failureReason = '') {
    const actor = this.requireWriter(ctx); if (!['SETTLED', 'FAILED'].includes(status)) throw new Error('Invalid final status');
    const key = this.key('disbursement', id), payout = await this.get<DisbursementAsset>(ctx, key);
    const allocationKey = this.key('allocation', payout.allocationId), allocation = await this.get<AllocationAsset>(ctx, allocationKey);
    if (allocation.ownerMsp !== actor.msp) throw new Error('Only the owning organization can finalize');
    const result = settle(allocation, payout, status as 'SETTLED' | 'FAILED', this.now(ctx));
    result.payout.bankReference = bankReference; if (failureReason) result.payout.failureReason = failureReason;
    await this.put(ctx, allocationKey, result.allocation); await this.put(ctx, key, result.payout);
    this.emit(ctx, `Disbursement${status === 'SETTLED' ? 'Settled' : 'Failed'}`, { ...result.payout, beneficiaryRef: undefined }); return JSON.stringify(result.payout);
  }

  @Transaction()
  async ReverseDisbursement(ctx: Context, id: string, reason: string) {
    const actor = this.requireWriter(ctx), key = this.key('disbursement', id), payout = await this.get<DisbursementAsset>(ctx, key);
    const allocationKey = this.key('allocation', payout.allocationId), allocation = await this.get<AllocationAsset>(ctx, allocationKey);
    if (allocation.ownerMsp !== actor.msp) throw new Error('Only the owning organization can reverse');
    const result = reverse(allocation, payout, this.now(ctx)); result.payout.failureReason = reason;
    await this.put(ctx, allocationKey, result.allocation); await this.put(ctx, key, result.payout);
    this.emit(ctx, 'DisbursementReversed', { ...result.payout, beneficiaryRef: undefined }); return JSON.stringify(result.payout);
  }

  @Transaction(false)
  @Returns('string')
  async ReadAsset(ctx: Context, type: string, id: string) { return JSON.stringify(await this.get(ctx, this.key(type, id))); }

  @Transaction(false)
  async GetHistory(ctx: Context, type: string, id: string) {
    const iterator = await ctx.stub.getHistoryForKey(this.key(type, id)); const records: unknown[] = [];
    while (true) { const item = await iterator.next(); if (item.value) records.push({ txId: item.value.txId, timestamp: item.value.timestamp, isDelete: item.value.isDelete, value: item.value.value.length ? JSON.parse(item.value.value.toString()) : null }); if (item.done) break; }
    await iterator.close(); return JSON.stringify(records);
  }
}
