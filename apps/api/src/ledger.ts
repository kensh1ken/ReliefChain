import { randomUUID } from 'node:crypto';
import { createPrivateKey } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { credentials } from '@grpc/grpc-js';
import { connect, hash, signers } from '@hyperledger/fabric-gateway';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ledgerEventEnvelopeSchema } from '@reliefchain/contracts';

export interface LedgerReceipt { transactionId: string; blockNumber: number | null; committedAt: string; status: 'VALID'; }
export interface LedgerSubmissionEvent { name: string; entityType: string; entityId: string; actorMsp: 'GovernmentMSP' | 'NgoMSP'; payload: unknown; }
export interface LedgerPort { submit(transaction: string, args: string[], event: LedgerSubmissionEvent, correlationId?: string): Promise<LedgerReceipt>; evaluate(transaction: string, args: string[]): Promise<unknown>; }

export function ledgerErrorHasCode(error: unknown, code: string): boolean {
  const marker = `[${code}]`, seen = new Set<unknown>();
  const contains = (value: unknown): boolean => {
    if (typeof value === 'string') return value.includes(marker);
    if (!value || typeof value !== 'object' || seen.has(value)) return false;
    seen.add(value);
    const candidate = value as { message?: unknown; details?: unknown; cause?: unknown };
    return contains(candidate.message) || contains(candidate.details) || contains(candidate.cause) ||
      (Array.isArray(value) && value.some(contains));
  };
  return contains(error);
}

function seedAssetLookup(transaction: string, args: string[], actorMsp: string) {
  switch (transaction) {
    case 'RegisterDisaster': return { type: 'disaster', id: args[0], expected: { docType: 'disaster', id: args[0], stateCode: args[2] } };
    case 'RegisterScheme': return { type: 'scheme', id: args[0], expected: { docType: 'scheme', id: args[0], disasterId: args[1] } };
    case 'CreateFundSource': return { type: 'source', id: args[0], expected: { docType: 'fundSource', id: args[0], disasterId: args[1], sourceType: args[2], amountPaise: Number(args[4]), ownerMsp: actorMsp } };
    case 'AllocateFunds': return { type: 'allocation', id: args[0], expected: { docType: 'allocation', id: args[0], sourceId: args[1], schemeId: args[2], districtCode: args[3], amountPaise: Number(args[4]), ownerMsp: actorMsp } };
    case 'RegisterBeneficiaryCommitment': return { type: 'beneficiary', id: args[0], expected: { docType: 'beneficiaryCommitment', districtCode: args[1], schemeId: args[2] } };
    case 'InitiateDisbursement': return { type: 'disbursement', id: args[0], expected: { docType: 'disbursement', id: args[0], publicReference: args[1], allocationId: args[2], amountPaise: Number(args[4]) } };
    default: throw new Error(`[SEED_LEDGER_CONFLICT] ${transaction} does not support duplicate recovery`);
  }
}

export function assertMatchingSeedAsset(transaction: string, args: string[], actorMsp: string, asset: unknown) {
  if (!asset || typeof asset !== 'object') throw new Error(`[SEED_LEDGER_CONFLICT] ${transaction} returned an invalid existing asset`);
  const { expected } = seedAssetLookup(transaction, args, actorMsp), actual = asset as Record<string, unknown>;
  for (const [field, value] of Object.entries(expected)) {
    if (actual[field] !== value) throw new Error(`[SEED_LEDGER_CONFLICT] Existing ${transaction} asset has a different ${field}`);
  }
}

@Injectable()
export class LedgerService implements LedgerPort, OnApplicationShutdown {
  private grpc: import('@grpc/grpc-js').Client[] = [];
  private contracts = new Map<string, import('@hyperledger/fabric-gateway').Contract>();
  constructor(private readonly db: DatabaseService) {}

  private async fabricContract(mspId = process.env.FABRIC_MSP_ID ?? 'GovernmentMSP') {
    const cached = this.contracts.get(mspId); if (cached) return cached;
    const prefix = mspId === 'NgoMSP' ? 'FABRIC_NGO' : 'FABRIC_GOVERNMENT';
    const [tls, cert, keyPem] = await Promise.all([
      readFile(process.env[`${prefix}_TLS_CERT_PATH`] ?? process.env.FABRIC_TLS_CERT_PATH!),
      readFile(process.env[`${prefix}_CERT_PATH`] ?? process.env.FABRIC_CERT_PATH!),
      readFile(process.env[`${prefix}_KEY_PATH`] ?? process.env.FABRIC_KEY_PATH!)
    ]);
    const { Client } = await import('@grpc/grpc-js');
    const grpc = new Client(process.env[`${prefix}_GATEWAY_PEER`] ?? process.env.FABRIC_GATEWAY_PEER!, credentials.createSsl(tls)); this.grpc.push(grpc);
    const gateway = connect({
      client: grpc, identity: { mspId, credentials: cert },
      signer: signers.newPrivateKeySigner(createPrivateKey(keyPem)), hash: hash.sha256,
      evaluateOptions: () => ({ deadline: Date.now() + 5000 }), endorseOptions: () => ({ deadline: Date.now() + 15000 }),
      submitOptions: () => ({ deadline: Date.now() + 5000 }), commitStatusOptions: () => ({ deadline: Date.now() + 60000 })
    });
    const contract = gateway.getNetwork(process.env.FABRIC_CHANNEL ?? 'reliefchannel').getContract(process.env.FABRIC_CHAINCODE ?? 'relief-funds');
    this.contracts.set(mspId, contract); return contract;
  }

  async submit(transaction: string, args: string[], event: LedgerSubmissionEvent, correlationId?: string): Promise<LedgerReceipt> {
    if (process.env.LEDGER_MODE === 'fabric') {
      const contract = await this.fabricContract(event.actorMsp);
      try {
        const proposal = contract.newProposal(transaction, { arguments: args }); const endorsed = await proposal.endorse();
        const submitted = await endorsed.submit(); const status = await submitted.getStatus();
        if (!status.successful) throw new Error(`Fabric transaction ${status.transactionId} failed with code ${status.code}`);
        return { transactionId: status.transactionId, blockNumber: status.blockNumber ? Number(status.blockNumber) : null, committedAt: new Date().toISOString(), status: 'VALID' };
      } catch (error) {
        if (!correlationId?.startsWith('seed:') || !ledgerErrorHasCode(error, 'LEDGER_DUPLICATE')) throw error;
        const lookup = seedAssetLookup(transaction, args, event.actorMsp);
        const asset = JSON.parse(Buffer.from(await contract.evaluateTransaction('ReadAsset', lookup.type, lookup.id)).toString()) as Record<string, unknown>;
        assertMatchingSeedAsset(transaction, args, event.actorMsp, asset);
        const history = JSON.parse(Buffer.from(await contract.evaluateTransaction('GetHistory', lookup.type, lookup.id)).toString()) as Array<{ txId?: string; isDelete?: boolean; value?: unknown }>;
        const creation = history.find((record) => !record.isDelete && record.value);
        if (!creation?.txId) throw new Error(`[SEED_LEDGER_CONFLICT] No creation transaction found for existing ${transaction} asset`);
        return { transactionId: creation.txId, blockNumber: null, committedAt: String(asset.createdAt ?? new Date().toISOString()), status: 'VALID' };
      }
    }
    const receipt: LedgerReceipt = { transactionId: randomUUID().replaceAll('-', ''), blockNumber: null, committedAt: new Date().toISOString(), status: 'VALID' };
    await this.record(event, receipt, correlationId); return receipt;
  }
  async evaluate(transaction: string, args: string[]) {
    if (process.env.LEDGER_MODE !== 'fabric') return null;
    const bytes = await (await this.fabricContract()).evaluateTransaction(transaction, ...args);
    return JSON.parse(Buffer.from(bytes).toString());
  }
  private async record(event: LedgerSubmissionEvent, receipt: LedgerReceipt, correlationId?: string) {
    const envelope = ledgerEventEnvelopeSchema.parse({
      schemaVersion: 1,
      eventType: event.name,
      entityType: event.entityType,
      entityId: event.name === 'BeneficiaryCommitted' ? `commitment:${receipt.transactionId}` : event.entityId,
      occurredAt: receipt.committedAt,
      transactionId: receipt.transactionId,
      actorMsp: event.actorMsp,
      payload: event.payload
    });
    await this.db.query(`INSERT INTO ledger_events(event_name,entity_type,entity_id,payload,transaction_id,block_number,committed_at,correlation_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(transaction_id) DO NOTHING`,
      [envelope.eventType, envelope.entityType, envelope.entityId, JSON.stringify(envelope.payload), receipt.transactionId, receipt.blockNumber, receipt.committedAt, correlationId ?? null]);
  }
  onApplicationShutdown() { this.grpc.forEach((client) => client.close()); }
}
