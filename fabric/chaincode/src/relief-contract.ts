import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { AllocationAsset, DisbursementAsset, FundSourceAsset, allocate, reserve, reverse, settle } from './domain';

type Writer = { role: 'GOVERNMENT' | 'NGO'; msp: 'GovernmentMSP' | 'NgoMSP' };
type EventName = 'DisasterRegistered' | 'SchemeRegistered' | 'FundSourceCreated' | 'FundsAllocated' |
  'BeneficiaryCommitted' | 'DisbursementInitiated' | 'DisbursementSettled' | 'DisbursementFailed' | 'DisbursementReversed';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BENEFICIARY_REF = /^ben_[a-f0-9]{64}$/;
const PUBLIC_REF = /^RC-\d{4}-[A-Z0-9]{8}$/;
const PROVIDER_HASH = /^sha256:[a-f0-9]{64}$/;
const REASON_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const MAX_PAISE = 1_000_000_000_000;

function fail(code: string, message: string): never { throw new Error(`[${code}] ${message}`); }

@Info({ title: 'ReliefFundsContract', description: 'Privacy-preserving disaster relief fund ledger v1' })
export class ReliefFundsContract extends Contract {
  private key(type: string, id: string) { return `${type}:${id}`; }
  private now(ctx: Context) {
    const stamp = ctx.stub.getTxTimestamp();
    return new Date(Number(stamp.seconds) * 1000 + Math.floor(stamp.nanos / 1_000_000)).toISOString();
  }
  private validateUuid(value: string, field: string) { if (!UUID.test(value)) fail('LEDGER_INVALID_ARGUMENT', `${field} must be a UUID`); }
  private validateName(value: string, field: string) { if (value.trim().length < 3 || value.length > 120) fail('LEDGER_INVALID_ARGUMENT', `${field} must contain 3 to 120 characters`); }
  private amount(value: string): number {
    if (!/^[1-9]\d*$/.test(value)) fail('LEDGER_INVALID_AMOUNT', 'amountPaise must be a canonical positive decimal string');
    const parsed = BigInt(value);
    if (parsed > BigInt(MAX_PAISE)) fail('LEDGER_INVALID_AMOUNT', `amountPaise must not exceed ${MAX_PAISE}`);
    return Number(parsed);
  }
  private async get<T>(ctx: Context, key: string): Promise<T> {
    const bytes = await ctx.stub.getState(key);
    if (!bytes?.length) fail('LEDGER_NOT_FOUND', `${key} does not exist`);
    return JSON.parse(bytes.toString()) as T;
  }
  private async unique(ctx: Context, key: string, message: string) {
    if ((await ctx.stub.getState(key)).length) fail('LEDGER_DUPLICATE', message);
  }
  private async put(ctx: Context, key: string, value: unknown) { await ctx.stub.putState(key, Buffer.from(JSON.stringify(value))); }
  private requireWriter(ctx: Context): Writer {
    const msp = ctx.clientIdentity.getMSPID();
    const fallback = msp === 'GovernmentMSP' ? 'GOVERNMENT' : msp === 'NgoMSP' ? 'NGO' : null;
    const role = ctx.clientIdentity.getAttributeValue('role') ?? fallback;
    if ((msp !== 'GovernmentMSP' && msp !== 'NgoMSP') || (role !== 'GOVERNMENT' && role !== 'NGO')) {
      fail('LEDGER_UNAUTHORIZED', 'Government or NGO writer identity required');
    }
    return { role, msp };
  }
  private emit(ctx: Context, eventType: EventName, entityType: string, entityId: string, actorMsp: string, payload: object) {
    ctx.stub.setEvent(eventType, Buffer.from(JSON.stringify({
      schemaVersion: 1, eventType, entityType, entityId, occurredAt: this.now(ctx),
      transactionId: ctx.stub.getTxID(), actorMsp, payload
    })));
  }
  private domain<T>(work: () => T): T {
    try { return work(); } catch (error) {
      const message = error instanceof Error ? error.message : 'Ledger invariant failed';
      if (message.includes('owning organization')) fail('LEDGER_OWNERSHIP_MISMATCH', message);
      if (message.includes('exceeds') || message.includes('invariant')) fail('LEDGER_INSUFFICIENT_BALANCE', message);
      if (message.includes('Only pending') || message.includes('Only settled') || message.includes('transition')) fail('LEDGER_INVALID_TRANSITION', message);
      fail('LEDGER_INVALID_ARGUMENT', message);
    }
  }
  private view(asset: any): object {
    switch (asset.docType) {
      case 'disaster': return { docType: asset.docType, id: asset.id, stateCode: asset.stateCode, createdAt: asset.createdAt };
      case 'scheme': return { docType: asset.docType, id: asset.id, disasterId: asset.disasterId, createdAt: asset.createdAt };
      case 'fundSource': return { docType: asset.docType, id: asset.id, ownerMsp: asset.ownerMsp, sourceType: asset.sourceType, disasterId: asset.disasterId, amountPaise: asset.amountPaise, allocatedPaise: asset.allocatedPaise, createdAt: asset.createdAt };
      case 'allocation': return { docType: asset.docType, id: asset.id, sourceId: asset.sourceId, ownerMsp: asset.ownerMsp, schemeId: asset.schemeId, districtCode: asset.districtCode, amountPaise: asset.amountPaise, disbursedPaise: asset.disbursedPaise, reservedPaise: asset.reservedPaise, createdAt: asset.createdAt };
      case 'beneficiaryCommitment': return { docType: asset.docType, commitmentId: asset.commitmentId, districtCode: asset.districtCode, schemeId: asset.schemeId, createdAt: asset.createdAt };
      case 'disbursement': return { docType: asset.docType, id: asset.id, publicReference: asset.publicReference, allocationId: asset.allocationId, amountPaise: asset.amountPaise, status: asset.status, ...(asset.providerReferenceHash ? { providerReferenceHash: asset.providerReferenceHash } : {}), ...(asset.reasonCode ? { reasonCode: asset.reasonCode } : {}), createdAt: asset.createdAt, updatedAt: asset.updatedAt };
      default: fail('LEDGER_INVALID_ARGUMENT', 'Unsupported asset type');
    }
  }

  @Transaction()
  async RegisterDisaster(ctx: Context, id: string, name: string, stateCode: string): Promise<string> {
    const actor = this.requireWriter(ctx); this.validateUuid(id, 'id'); this.validateName(name, 'name');
    if (!/^[A-Z]{2}$/.test(stateCode)) fail('LEDGER_INVALID_ARGUMENT', 'stateCode must contain two uppercase letters');
    const key = this.key('disaster', id); await this.unique(ctx, key, 'Disaster already exists');
    const asset = { docType: 'disaster', id, name, stateCode, createdAt: this.now(ctx) };
    await this.put(ctx, key, asset); this.emit(ctx, 'DisasterRegistered', 'disaster', id, actor.msp, { stateCode });
    return JSON.stringify(this.view(asset));
  }

  @Transaction()
  async RegisterScheme(ctx: Context, id: string, disasterId: string, name: string): Promise<string> {
    const actor = this.requireWriter(ctx); this.validateUuid(id, 'id'); this.validateUuid(disasterId, 'disasterId'); this.validateName(name, 'name');
    await this.get(ctx, this.key('disaster', disasterId));
    const key = this.key('scheme', id); await this.unique(ctx, key, 'Scheme already exists');
    const asset = { docType: 'scheme', id, disasterId, name, createdAt: this.now(ctx) };
    await this.put(ctx, key, asset); this.emit(ctx, 'SchemeRegistered', 'scheme', id, actor.msp, { disasterId });
    return JSON.stringify(this.view(asset));
  }

  @Transaction()
  async CreateFundSource(ctx: Context, id: string, disasterId: string, sourceType: string, name: string, amountRaw: string) {
    const actor = this.requireWriter(ctx); this.validateUuid(id, 'id'); this.validateUuid(disasterId, 'disasterId'); this.validateName(name, 'name');
    if (!['CENTRAL_GOVERNMENT', 'STATE_GOVERNMENT', 'NGO'].includes(sourceType)) fail('LEDGER_INVALID_ARGUMENT', 'Invalid sourceType');
    if (actor.role === 'NGO' && sourceType !== 'NGO') fail('LEDGER_UNAUTHORIZED', 'NGO identities can only create NGO sources');
    await this.get(ctx, this.key('disaster', disasterId)); const amountPaise = this.amount(amountRaw);
    const key = this.key('source', id); await this.unique(ctx, key, 'Fund source already exists');
    const asset: FundSourceAsset = { docType: 'fundSource', id, ownerMsp: actor.msp, sourceType, name, disasterId, amountPaise, allocatedPaise: 0, createdAt: this.now(ctx) };
    await this.put(ctx, key, asset); this.emit(ctx, 'FundSourceCreated', 'fundSource', id, actor.msp, { disasterId, sourceType, amountPaise, ownerMsp: actor.msp });
    return JSON.stringify(this.view(asset));
  }

  @Transaction()
  async AllocateFunds(ctx: Context, id: string, sourceId: string, schemeId: string, districtCode: string, amountRaw: string) {
    const actor = this.requireWriter(ctx); [id, sourceId, schemeId].forEach((value, index) => this.validateUuid(value, ['id', 'sourceId', 'schemeId'][index]));
    if (!/^[A-Z]{2}-[A-Z0-9]{2,9}$/.test(districtCode)) fail('LEDGER_INVALID_ARGUMENT', 'Invalid districtCode');
    const sourceKey = this.key('source', sourceId), source = await this.get<FundSourceAsset>(ctx, sourceKey);
    await this.get(ctx, this.key('scheme', schemeId)); const key = this.key('allocation', id); await this.unique(ctx, key, 'Allocation already exists');
    const amountPaise = this.amount(amountRaw), updated = this.domain(() => allocate(source, amountPaise, actor.msp));
    const asset: AllocationAsset = { docType: 'allocation', id, sourceId, ownerMsp: actor.msp, schemeId, districtCode, amountPaise, disbursedPaise: 0, reservedPaise: 0, createdAt: this.now(ctx) };
    await this.put(ctx, sourceKey, updated); await this.put(ctx, key, asset);
    this.emit(ctx, 'FundsAllocated', 'allocation', id, actor.msp, { sourceId, schemeId, districtCode, amountPaise, ownerMsp: actor.msp });
    return JSON.stringify(this.view(asset));
  }

  @Transaction()
  async RegisterBeneficiaryCommitment(ctx: Context, beneficiaryRef: string, districtCode: string, schemeId: string) {
    const actor = this.requireWriter(ctx); if (!BENEFICIARY_REF.test(beneficiaryRef)) fail('LEDGER_INVALID_ARGUMENT', 'Invalid beneficiaryRef');
    if (!/^[A-Z]{2}-[A-Z0-9]{2,9}$/.test(districtCode)) fail('LEDGER_INVALID_ARGUMENT', 'Invalid districtCode'); this.validateUuid(schemeId, 'schemeId');
    await this.get(ctx, this.key('scheme', schemeId)); const key = this.key('beneficiary', beneficiaryRef); await this.unique(ctx, key, 'Beneficiary commitment already exists');
    const commitmentId = `commitment:${ctx.stub.getTxID()}`;
    const asset = { docType: 'beneficiaryCommitment', commitmentId, beneficiaryRef, districtCode, schemeId, createdAt: this.now(ctx) };
    await this.put(ctx, key, asset); this.emit(ctx, 'BeneficiaryCommitted', 'beneficiaryCommitment', commitmentId, actor.msp, { districtCode, schemeId });
    return JSON.stringify(this.view(asset));
  }

  @Transaction()
  async InitiateDisbursement(ctx: Context, id: string, publicReference: string, allocationId: string, beneficiaryRef: string, amountRaw: string, idempotencyKey: string) {
    const actor = this.requireWriter(ctx); this.validateUuid(id, 'id'); this.validateUuid(allocationId, 'allocationId');
    if (!PUBLIC_REF.test(publicReference)) fail('LEDGER_INVALID_ARGUMENT', 'Invalid publicReference');
    if (!BENEFICIARY_REF.test(beneficiaryRef)) fail('LEDGER_INVALID_ARGUMENT', 'Invalid beneficiaryRef');
    if (idempotencyKey.length < 8 || idempotencyKey.length > 100) fail('LEDGER_INVALID_ARGUMENT', 'Invalid idempotencyKey');
    const payoutKey = this.key('disbursement', id); await this.unique(ctx, payoutKey, 'Disbursement already exists');
    const idemKey = this.key('idempotency', idempotencyKey); await this.unique(ctx, idemKey, 'Duplicate idempotency key');
    await this.get(ctx, this.key('beneficiary', beneficiaryRef));
    const allocationKey = this.key('allocation', allocationId), allocation = await this.get<AllocationAsset>(ctx, allocationKey);
    const amountPaise = this.amount(amountRaw), updated = this.domain(() => reserve(allocation, amountPaise, actor.msp)), now = this.now(ctx);
    const asset: DisbursementAsset = { docType: 'disbursement', id, publicReference, allocationId, beneficiaryRef, amountPaise, status: 'PENDING', idempotencyKey, createdAt: now, updatedAt: now };
    await this.put(ctx, allocationKey, updated); await this.put(ctx, payoutKey, asset); await this.put(ctx, idemKey, { id });
    this.emit(ctx, 'DisbursementInitiated', 'disbursement', id, actor.msp, { publicReference, allocationId, amountPaise, ownerMsp: actor.msp, fromStatus: null, toStatus: 'PENDING' });
    return JSON.stringify(this.view(asset));
  }

  @Transaction()
  async FinalizeDisbursement(ctx: Context, id: string, status: string, providerReferenceHash: string, reasonCode = '') {
    const actor = this.requireWriter(ctx); this.validateUuid(id, 'id');
    if (status !== 'SETTLED' && status !== 'FAILED') fail('LEDGER_INVALID_TRANSITION', 'Final status must be SETTLED or FAILED');
    if (providerReferenceHash && !PROVIDER_HASH.test(providerReferenceHash)) fail('LEDGER_PRIVACY_VIOLATION', 'Provider reference must be a SHA-256 hash');
    if (status === 'FAILED' && !REASON_CODE.test(reasonCode)) fail('LEDGER_INVALID_ARGUMENT', 'FAILED requires a stable reasonCode');
    if (status === 'SETTLED' && reasonCode) fail('LEDGER_INVALID_ARGUMENT', 'SETTLED must not include a reasonCode');
    const key = this.key('disbursement', id), payout = await this.get<DisbursementAsset>(ctx, key);
    const allocationKey = this.key('allocation', payout.allocationId), allocation = await this.get<AllocationAsset>(ctx, allocationKey);
    if (allocation.ownerMsp !== actor.msp) fail('LEDGER_OWNERSHIP_MISMATCH', 'Only the owning organization can finalize');
    const result = this.domain(() => settle(allocation, payout, status, this.now(ctx)));
    if (providerReferenceHash) result.payout.providerReferenceHash = providerReferenceHash;
    if (status === 'FAILED') result.payout.reasonCode = reasonCode;
    await this.put(ctx, allocationKey, result.allocation); await this.put(ctx, key, result.payout);
    const payload = { publicReference: payout.publicReference, allocationId: payout.allocationId, amountPaise: payout.amountPaise, ownerMsp: actor.msp, fromStatus: 'PENDING', toStatus: status, ...(providerReferenceHash ? { providerReferenceHash } : {}), ...(status === 'FAILED' ? { reasonCode } : {}) };
    this.emit(ctx, status === 'SETTLED' ? 'DisbursementSettled' : 'DisbursementFailed', 'disbursement', id, actor.msp, payload);
    return JSON.stringify(this.view(result.payout));
  }

  @Transaction()
  async ReverseDisbursement(ctx: Context, id: string, reasonCode: string) {
    const actor = this.requireWriter(ctx); this.validateUuid(id, 'id'); if (!REASON_CODE.test(reasonCode)) fail('LEDGER_INVALID_ARGUMENT', 'Invalid reasonCode');
    const key = this.key('disbursement', id), payout = await this.get<DisbursementAsset>(ctx, key);
    const allocationKey = this.key('allocation', payout.allocationId), allocation = await this.get<AllocationAsset>(ctx, allocationKey);
    if (allocation.ownerMsp !== actor.msp) fail('LEDGER_OWNERSHIP_MISMATCH', 'Only the owning organization can reverse');
    const result = this.domain(() => reverse(allocation, payout, this.now(ctx))); result.payout.reasonCode = reasonCode;
    await this.put(ctx, allocationKey, result.allocation); await this.put(ctx, key, result.payout);
    this.emit(ctx, 'DisbursementReversed', 'disbursement', id, actor.msp, { publicReference: payout.publicReference, allocationId: payout.allocationId, amountPaise: payout.amountPaise, ownerMsp: actor.msp, fromStatus: 'SETTLED', toStatus: 'REVERSED', reasonCode });
    return JSON.stringify(this.view(result.payout));
  }

  @Transaction(false)
  @Returns('string')
  async ReadAsset(ctx: Context, type: string, id: string) { return JSON.stringify(this.view(await this.get(ctx, this.key(type, id)))); }

  @Transaction(false)
  async GetHistory(ctx: Context, type: string, id: string) {
    const iterator = await ctx.stub.getHistoryForKey(this.key(type, id)); const records: unknown[] = [];
    while (true) {
      const item = await iterator.next();
      if (item.value) records.push({ txId: item.value.txId, timestamp: item.value.timestamp, isDelete: item.value.isDelete, value: item.value.value.length ? this.view(JSON.parse(item.value.value.toString())) : null });
      if (item.done) break;
    }
    await iterator.close(); return JSON.stringify(records);
  }
}
