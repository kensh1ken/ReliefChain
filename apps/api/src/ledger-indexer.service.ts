import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { connect, hash, signers } from '@hyperledger/fabric-gateway';
import type { ChaincodeEvent, Gateway, Network } from '@hyperledger/fabric-gateway';
import type { Client } from '@grpc/grpc-js';
import { credentials } from '@grpc/grpc-js';
import { createPrivateKey, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { ledgerEventEnvelopeSchema } from '@reliefchain/contracts';
import type { LedgerEventEnvelope } from '@reliefchain/contracts';
import { DatabaseService } from './database.service';

interface IndexerState {
  lastProcessedBlock: number;
  lastProcessedTransaction: string;
  lastProcessedEvent: string;
  isProcessing: boolean;
  projectionLag: number | null;
  lastSyncTime: string;
  connected: boolean;
  lastError: string | null;
}

type EventStream = Awaited<ReturnType<Network['getChaincodeEvents']>>;

class InvalidLedgerEventError extends Error {}

@Injectable()
export class LedgerIndexerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(LedgerIndexerService.name);
  private grpc?: Client;
  private gateway?: Gateway;
  private network?: Network;
  private eventStream?: EventStream;
  private stopping = false;
  private runner?: Promise<void>;
  private readonly retryDelayMs = Number(process.env.INDEXER_RETRY_DELAY_MS ?? 5000);
  private state: IndexerState = {
    lastProcessedBlock: 0,
    lastProcessedTransaction: '',
    lastProcessedEvent: '',
    isProcessing: false,
    projectionLag: null,
    lastSyncTime: new Date(0).toISOString(),
    connected: false,
    lastError: null
  };

  constructor(private readonly db: DatabaseService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.LEDGER_MODE !== 'fabric') {
      this.logger.log('Fabric event indexer disabled in memory mode');
      return;
    }
    await this.initializeGateway();
    await this.loadCheckpoint();
    this.runner = this.runEventLoop();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopping = true;
    this.eventStream?.close();
    await this.runner?.catch(() => undefined);
    this.gateway?.close();
    this.grpc?.close();
    this.state.connected = false;
  }

  private async initializeGateway(): Promise<void> {
    const mspId = process.env.FABRIC_INDEXER_MSP_ID ?? process.env.FABRIC_MSP_ID ?? 'GovernmentMSP';
    const prefix = mspId === 'NgoMSP' ? 'FABRIC_NGO' : 'FABRIC_GOVERNMENT';
    const tlsPath = process.env[`${prefix}_TLS_CERT_PATH`] ?? process.env.FABRIC_TLS_CERT_PATH;
    const certPath = process.env[`${prefix}_CERT_PATH`] ?? process.env.FABRIC_CERT_PATH;
    const keyPath = process.env[`${prefix}_KEY_PATH`] ?? process.env.FABRIC_KEY_PATH;
    const peer = process.env[`${prefix}_GATEWAY_PEER`] ?? process.env.FABRIC_GATEWAY_PEER;
    if (!tlsPath || !certPath || !keyPath || !peer) throw new Error('Fabric indexer gateway credentials are incomplete');

    const [tls, cert, keyPem] = await Promise.all([readFile(tlsPath), readFile(certPath), readFile(keyPath)]);
    const { Client } = await import('@grpc/grpc-js');
    this.grpc = new Client(peer, credentials.createSsl(tls));
    this.gateway = connect({
      client: this.grpc,
      identity: { mspId, credentials: cert },
      signer: signers.newPrivateKeySigner(createPrivateKey(keyPem)),
      hash: hash.sha256,
      evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
      endorseOptions: () => ({ deadline: Date.now() + 15000 }),
      submitOptions: () => ({ deadline: Date.now() + 5000 }),
      commitStatusOptions: () => ({ deadline: Date.now() + 60000 })
    });
    this.network = this.gateway.getNetwork(process.env.FABRIC_CHANNEL ?? 'reliefchannel');
  }

  private async loadCheckpoint(): Promise<void> {
    const result = await this.db.query<{ block_number: string | number; updated_at: Date | string }>(
      'SELECT block_number, updated_at FROM indexer_checkpoint WHERE id = 1'
    );
    const row = result.rows[0];
    if (!row) throw new Error('Indexer checkpoint row is missing');
    this.state.lastProcessedBlock = Number(row.block_number);
    this.state.lastSyncTime = new Date(row.updated_at).toISOString();
  }

  private async runEventLoop(): Promise<void> {
    if (!this.network) return;
    while (!this.stopping) {
      try {
        this.eventStream = await this.network.getChaincodeEvents(
          process.env.FABRIC_CHAINCODE ?? 'relief-funds',
          { startBlock: BigInt(Math.max(0, this.state.lastProcessedBlock)) }
        );
        this.state.connected = true;
        this.state.lastError = null;
        for await (const event of this.eventStream) {
          if (this.stopping) break;
          await this.processChaincodeEvent(event, randomUUID());
        }
      } catch (error) {
        this.state.connected = false;
        this.state.lastError = error instanceof Error ? error.message : 'Unknown indexer error';
        await this.updateIndexerError(error);
        if (error instanceof InvalidLedgerEventError) {
          this.logger.error(`Indexer halted on invalid ledger event: ${error.message}`);
          return;
        }
        if (!this.stopping) await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
      } finally {
        this.eventStream?.close();
        this.eventStream = undefined;
      }
    }
  }

  private decodeEvent(event: ChaincodeEvent): LedgerEventEnvelope {
    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.from(event.payload).toString('utf8'));
    } catch {
      throw new InvalidLedgerEventError(`Transaction ${event.transactionId} emitted non-JSON event data`);
    }
    const parsed = ledgerEventEnvelopeSchema.safeParse(raw);
    if (!parsed.success) throw new InvalidLedgerEventError(`Transaction ${event.transactionId} emitted an invalid v1 envelope: ${parsed.error.message}`);
    if (parsed.data.transactionId !== event.transactionId) throw new InvalidLedgerEventError(`Envelope transactionId does not match ${event.transactionId}`);
    if (parsed.data.eventType !== event.eventName) throw new InvalidLedgerEventError(`Envelope eventType does not match ${event.eventName}`);
    return parsed.data;
  }

  private async processChaincodeEvent(event: ChaincodeEvent, correlationId: string): Promise<void> {
    const envelope = this.decodeEvent(event);
    const blockNumber = Number(event.blockNumber);
    if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) throw new InvalidLedgerEventError('Fabric block number exceeds the supported integer range');
    this.state.isProcessing = true;
    try {
      await this.db.transaction(async (client) => {
        await client.query(
          `INSERT INTO ledger_events(event_name,entity_type,entity_id,payload,transaction_id,block_number,committed_at,correlation_id)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT(transaction_id) DO NOTHING`,
          [envelope.eventType, envelope.entityType, envelope.entityId, JSON.stringify(envelope.payload), event.transactionId, blockNumber, envelope.occurredAt, correlationId]
        );
        await client.query(
          `UPDATE indexer_checkpoint
           SET block_number=GREATEST(block_number,$1),updated_at=now(),indexer_status='active',error_count=0,last_error=NULL
           WHERE id=1`,
          [blockNumber]
        );
      });
      this.state.lastProcessedBlock = Math.max(this.state.lastProcessedBlock, blockNumber);
      this.state.lastProcessedTransaction = event.transactionId;
      this.state.lastProcessedEvent = `${envelope.eventType}:${envelope.entityId}`;
      this.state.lastSyncTime = new Date().toISOString();
    } finally {
      this.state.isProcessing = false;
    }
  }

  private async updateIndexerError(error: unknown): Promise<void> {
    try {
      await this.db.query(
        `UPDATE indexer_checkpoint
         SET indexer_status='error',error_count=error_count+1,last_error=$1,updated_at=now()
         WHERE id=1`,
        [error instanceof Error ? error.message : 'Unknown indexer error']
      );
    } catch (updateError) {
      this.logger.error(`Unable to persist indexer error: ${String(updateError)}`);
    }
  }

  getState(): IndexerState { return { ...this.state }; }

  getHealthStatus() {
    const fabric = process.env.LEDGER_MODE === 'fabric';
    return {
      ledgerMode: process.env.LEDGER_MODE ?? 'memory',
      indexerActive: fabric && this.state.connected && !this.stopping,
      lastProcessedBlock: this.state.lastProcessedBlock,
      projectionLag: this.state.projectionLag,
      lastSyncTime: this.state.lastSyncTime,
      isProcessing: this.state.isProcessing,
      connected: this.state.connected,
      lastError: this.state.lastError
    };
  }

  async rebuildProjections(fromBlock = 0): Promise<void> {
    if (!Number.isSafeInteger(fromBlock) || fromBlock < 0) throw new Error('fromBlock must be a non-negative integer');
    this.eventStream?.close();
    await this.db.transaction(async (client) => {
      await client.query('DELETE FROM ledger_events WHERE block_number >= $1', [fromBlock]);
      await client.query(
        `UPDATE indexer_checkpoint SET block_number=$1,updated_at=now(),indexer_status='rebuilding',error_count=0,last_error=NULL WHERE id=1`,
        [fromBlock]
      );
    });
    this.state.lastProcessedBlock = fromBlock;
  }
}
