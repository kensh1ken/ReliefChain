import { Injectable, OnApplicationBootstrap, OnApplicationShutdown, Logger } from '@nestjs/common';
import { connect, hash, signers } from '@hyperledger/fabric-gateway';
import { createPrivateKey } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { credentials } from '@grpc/grpc-js';
import { DatabaseService } from './database.service';

interface IndexerState {
  lastProcessedBlock: number;
  lastProcessedTransaction: string;
  lastProcessedEvent: string;
  isProcessing: boolean;
  projectionLag: number;
  lastSyncTime: string;
}

interface IndexerConfig {
  syncIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
}

@Injectable()
export class LedgerIndexerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(LedgerIndexerService.name);
  private grpc: import('@grpc/grpc-js').Client[] = [];
  private gateway?: import('@hyperledger/fabric-gateway').Gateway;
  private network?: import('@hyperledger/fabric-gateway').Network;
  private syncTimer?: NodeJS.Timeout;
  private state: IndexerState = {
    lastProcessedBlock: 0,
    lastProcessedTransaction: '',
    lastProcessedEvent: '',
    isProcessing: false,
    projectionLag: 0,
    lastSyncTime: new Date().toISOString()
  };
  private config: IndexerConfig = {
    syncIntervalMs: parseInt(process.env.INDEXER_SYNC_INTERVAL_MS || '5000', 10),
    maxRetries: parseInt(process.env.INDEXER_MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.INDEXER_RETRY_DELAY_MS || '10000', 10),
    batchSize: parseInt(process.env.INDEXER_BATCH_SIZE || '10', 10)
  };

  constructor(private readonly db: DatabaseService) {}

  async onApplicationBootstrap() {
    if (process.env.LEDGER_MODE !== 'fabric') {
      this.logger.log('Indexer disabled in memory mode');
      return;
    }

    this.logger.log('Starting Fabric ledger indexer');
    await this.initializeGateway();
    await this.loadCheckpoint();
    this.syncTimer = setInterval(() => void this.sync(), this.config.syncIntervalMs);
    void this.sync();
  }

  onApplicationShutdown() {
    this.logger.log('Stopping Fabric ledger indexer');
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.grpc.forEach((client) => client.close());
    if (this.gateway) this.gateway.close();
  }

  private async initializeGateway() {
    const mspId = process.env.FABRIC_MSP_ID ?? 'GovernmentMSP';
    const prefix = mspId === 'NgoMSP' ? 'FABRIC_NGO' : 'FABRIC_GOVERNMENT';
    
    const [tls, cert, keyPem] = await Promise.all([
      readFile(process.env[`${prefix}_TLS_CERT_PATH`] ?? process.env.FABRIC_TLS_CERT_PATH!),
      readFile(process.env[`${prefix}_CERT_PATH`] ?? process.env.FABRIC_CERT_PATH!),
      readFile(process.env[`${prefix}_KEY_PATH`] ?? process.env.FABRIC_KEY_PATH!)
    ]);

    const { Client } = await import('@grpc/grpc-js');
    const grpc = new Client(
      process.env[`${prefix}_GATEWAY_PEER`] ?? process.env.FABRIC_GATEWAY_PEER!,
      credentials.createSsl(tls)
    );
    this.grpc.push(grpc);

    this.gateway = connect({
      client: grpc,
      identity: { mspId, credentials: cert },
      signer: signers.newPrivateKeySigner(createPrivateKey(keyPem)),
      hash: hash.sha256,
      evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
      endorseOptions: () => ({ deadline: Date.now() + 15000 }),
      submitOptions: () => ({ deadline: Date.now() + 5000 }),
      commitStatusOptions: () => ({ deadline: Date.now() + 60000 })
    });

    this.network = this.gateway.getNetwork(process.env.FABRIC_CHANNEL ?? 'reliefchannel');
    this.logger.log('Fabric gateway initialized for indexer');
  }

  private async loadCheckpoint() {
    try {
      const result = await this.db.query('SELECT block_number, updated_at FROM indexer_checkpoint WHERE id = 1');
      if (result.rowCount && result.rowCount > 0) {
        this.state.lastProcessedBlock = result.rows[0].block_number;
        this.state.lastSyncTime = result.rows[0].updated_at;
        this.logger.log(`Loaded checkpoint: block ${this.state.lastProcessedBlock}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load checkpoint: ${error}`);
      // Start from block 0 if checkpoint fails
      this.state.lastProcessedBlock = 0;
    }
  }

  private async saveCheckpoint(blockNumber: number, syncDurationMs?: number) {
    try {
      // Try the enhanced query first (with new columns)
      try {
        await this.db.query(
          `UPDATE indexer_checkpoint 
           SET block_number = $1, 
               updated_at = now(),
               indexer_status = 'active',
               error_count = 0,
               last_error = NULL,
               sync_duration_ms = $2
           WHERE id = 1`,
          [blockNumber, syncDurationMs]
        );
      } catch (columnError: any) {
        // Fallback to basic query if columns don't exist yet
        if (columnError.message && (columnError.message.includes('column') || columnError.message.includes('does not exist'))) {
          await this.db.query(
            'UPDATE indexer_checkpoint SET block_number = $1, updated_at = now() WHERE id = 1',
            [blockNumber]
          );
        } else {
          throw columnError;
        }
      }
      
      this.state.lastProcessedBlock = blockNumber;
      this.state.lastSyncTime = new Date().toISOString();
    } catch (error) {
      this.logger.error(`Failed to save checkpoint: ${error}`);
      await this.updateIndexerError(error);
    }
  }

  private async updateIndexerError(error: any) {
    try {
      // Try enhanced error tracking first
      try {
        await this.db.query(
          `UPDATE indexer_checkpoint 
           SET indexer_status = 'error',
               error_count = error_count + 1,
               last_error = $1,
               updated_at = now()
           WHERE id = 1`,
          [error instanceof Error ? error.message : 'Unknown error']
        );
      } catch (columnError: any) {
        // Fallback if columns don't exist
        if (columnError.message && (columnError.message.includes('column') || columnError.message.includes('does not exist'))) {
          await this.db.query(
            'UPDATE indexer_checkpoint SET updated_at = now() WHERE id = 1'
          );
        } else {
          throw columnError;
        }
      }
    } catch (updateError) {
      this.logger.error(`Failed to update indexer error state: ${updateError}`);
    }
  }

  private async sync() {
    if (this.state.isProcessing) {
      this.logger.debug('Sync already in progress, skipping');
      return;
    }

    if (process.env.LEDGER_MODE !== 'fabric' || !this.network) {
      return;
    }

    this.state.isProcessing = true;
    try {
      await this.processBlocks();
    } catch (error) {
      this.logger.error(`Sync error: ${error}`);
      await this.handleSyncError(error);
    } finally {
      this.state.isProcessing = false;
    }
  }

  private async processBlocks() {
    const startBlock = this.state.lastProcessedBlock + 1;
    const startTime = Date.now();
    const correlationId = randomUUID();
    
    try {
      // Get current blockchain height
      const currentHeight = await this.getBlockchainHeight();
      this.state.projectionLag = currentHeight - this.state.lastProcessedBlock;

      if (startBlock > currentHeight) {
        this.logger.debug(`No new blocks to process [correlation: ${correlationId}]`);
        return;
      }

      this.logger.debug(`Processing blocks from ${startBlock} to ${currentHeight} [correlation: ${correlationId}]`);

      // Process blocks in batches
      for (let blockNum = startBlock; blockNum <= currentHeight; blockNum += this.config.batchSize) {
        const endBlock = Math.min(blockNum + this.config.batchSize - 1, currentHeight);
        await this.processBlockRange(blockNum, endBlock, correlationId);
      }

      const syncDurationMs = Date.now() - startTime;
      await this.saveCheckpoint(currentHeight, syncDurationMs);
      
      this.logger.log(`Successfully processed blocks ${startBlock} to ${currentHeight} in ${syncDurationMs}ms [correlation: ${correlationId}]`);
    } catch (error) {
      this.logger.error(`Block processing error [correlation: ${correlationId}]: ${error}`);
      throw error;
    }
  }

  private async getBlockchainHeight(): Promise<number> {
    try {
      // Query the latest block number from Fabric
      if (this.network && (this.network as any).getBlock) {
        const block = await (this.network as any).getBlock('latest');
        return Number(block.header.number);
      } else {
        this.logger.warn('getBlock not available on network, returning 0');
        return 0;
      }
    } catch (error) {
      this.logger.error(`Failed to get blockchain height: ${error}`);
      throw error;
    }
  }

  private async processBlockRange(startBlock: number, endBlock: number, correlationId: string) {
    for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
      try {
        await this.processSingleBlock(blockNum, correlationId);
        await this.saveCheckpoint(blockNum);
      } catch (error) {
        this.logger.error(`Failed to process block ${blockNum} [correlation: ${correlationId}]: ${error}`);
        // Continue to next block to avoid getting stuck
        await this.saveCheckpoint(blockNum); // Save checkpoint even on failure to skip problematic block
      }
    }
  }

  private async processSingleBlock(blockNumber: number, correlationId: string) {
    try {
      // Use Fabric's getBlockByNumber method if available, otherwise skip in tests
      if (this.network && (this.network as any).getBlockByNumber) {
        const block = await (this.network as any).getBlockByNumber(blockNumber, false);
        
        for (const transaction of block.data.data) {
          await this.processTransaction(transaction, blockNumber, correlationId);
        }
      } else {
        // Skip processing if getBlock is not available (e.g., in tests)
        this.logger.debug(`Skipping block ${blockNumber} processing - getBlock not available [correlation: ${correlationId}]`);
      }
    } catch (error) {
      this.logger.error(`Failed to process block ${blockNumber} [correlation: ${correlationId}]: ${error}`);
      throw error;
    }
  }

  private async processTransaction(transaction: any, blockNumber: number, correlationId: string) {
    try {
      const transactionId = transaction.payload.header.channel_header.tx_id;
      
      // Skip already processed transactions (idempotency)
      const existing = await this.db.query(
        'SELECT 1 FROM ledger_events WHERE transaction_id = $1',
        [transactionId]
      );
      
      if (existing.rowCount && existing.rowCount > 0) {
        this.logger.debug(`Transaction ${transactionId} already processed, skipping [correlation: ${correlationId}]`);
        return;
      }

      // Extract events from transaction
      const events = this.extractEvents(transaction, blockNumber);
      
      for (const event of events) {
        await this.processEvent(event, transactionId, blockNumber, correlationId);
      }
    } catch (error) {
      this.logger.error(`Failed to process transaction [correlation: ${correlationId}]: ${error}`);
      // Continue with next transaction
    }
  }

  private extractEvents(transaction: any, blockNumber: number): any[] {
    const events: any[] = [];
    
    try {
      // Extract chaincode events from transaction actions
      const actions = transaction.payload.data.actions || [];
      
      for (const action of actions) {
        const payload = action.payload;
        if (payload && payload.action) {
          const chaincodeAction = payload.action.proposal_response_payload?.extension;
          if (chaincodeAction && chaincodeAction.events) {
            // Parse chaincode events
            const eventData = this.parseChaincodeEvents(chaincodeAction.events);
            events.push(...eventData);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to extract events from transaction: ${error}`);
    }

    return events;
  }

  private parseChaincodeEvents(events: Uint8Array): any[] {
    try {
      // Parse Fabric chaincode events
      const eventString = Buffer.from(events).toString('utf8');
      const eventData = JSON.parse(eventString);
      
      // Ensure event has required structure
      if (eventData.eventName && eventData.entityType && eventData.entityId) {
        return [{
          name: eventData.eventName,
          entityType: eventData.entityType,
          entityId: eventData.entityId,
          payload: eventData.payload || {}
        }];
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Failed to parse chaincode events: ${error}`);
      return [];
    }
  }

  private async processEvent(event: any, transactionId: string, blockNumber: number, correlationId: string) {
    try {
      // Check for duplicate events (idempotency)
      const existing = await this.db.query(
        'SELECT 1 FROM ledger_events WHERE transaction_id = $1 AND event_name = $2 AND entity_id = $3',
        [transactionId, event.name, event.entityId]
      );
      
      if (existing.rowCount && existing.rowCount > 0) {
        this.logger.debug(`Event ${event.name} for ${event.entityId} already processed, skipping [correlation: ${correlationId}]`);
        return;
      }

      // Insert event into ledger_events table with correlation ID
      await this.db.query(
        `INSERT INTO ledger_events(event_name, entity_type, entity_id, payload, transaction_id, block_number, committed_at, correlation_id)
         VALUES($1, $2, $3, $4, $5, $6, now(), $7)
         ON CONFLICT(transaction_id) DO NOTHING`,
        [event.name, event.entityType, event.entityId, JSON.stringify(event.payload), transactionId, blockNumber, correlationId]
      );

      // Update projections based on event type
      await this.updateProjections(event, transactionId, correlationId);

      this.state.lastProcessedEvent = `${event.name}:${event.entityId}`;
    } catch (error) {
      this.logger.error(`Failed to process event ${event.name} [correlation: ${correlationId}]: ${error}`);
      // Continue with next event
    }
  }

  private async updateProjections(event: any, transactionId: string, correlationId: string) {
    try {
      switch (event.name) {
        case 'DisbursementInitiated':
          await this.updateDisbursementInitiated(event, transactionId, correlationId);
          break;
        case 'DisbursementSettled':
          await this.updateDisbursementSettled(event, transactionId, correlationId);
          break;
        case 'DisbursementFailed':
          await this.updateDisbursementFailed(event, transactionId, correlationId);
          break;
        case 'DisbursementReversed':
          await this.updateDisbursementReversed(event, transactionId, correlationId);
          break;
        case 'FundsAllocated':
          await this.updateFundsAllocated(event, transactionId, correlationId);
          break;
        case 'BeneficiaryCommitted':
          await this.updateBeneficiaryCommitted(event, transactionId, correlationId);
          break;
        default:
          this.logger.debug(`No projection update for event ${event.name} [correlation: ${correlationId}]`);
      }
    } catch (error) {
      this.logger.error(`Failed to update projections for event ${event.name}: ${error}`);
    }
  }

  private async updateDisbursementInitiated(event: any, transactionId: string, correlationId: string) {
    // Create or update disbursement projection
    await this.db.query(
      `INSERT INTO disbursements(id, public_reference, allocation_id, beneficiary_id, beneficiary_ref, amount_paise, status, proof, created_at, updated_at)
       VALUES($1, $2, $3, $4, $5, $6, 'PENDING', $7, now(), now())
       ON CONFLICT(id) DO UPDATE SET
         status = 'PENDING',
         proof = $7,
         updated_at = now()`,
      [
        event.entityId,
        event.payload.publicReference,
        event.payload.allocationId,
        event.payload.beneficiaryId || null,
        event.payload.beneficiaryRef,
        event.payload.amountPaise,
        JSON.stringify({ transactionId, blockNumber: this.state.lastProcessedBlock, correlationId })
      ]
    );
  }

  private async updateDisbursementSettled(event: any, transactionId: string, correlationId: string) {
    await this.db.query(
      `UPDATE disbursements
       SET status = 'SETTLED',
           bank_reference = $2,
           proof = $3,
           updated_at = now()
       WHERE id = $1`,
      [
        event.entityId,
        event.payload.bankReference,
        JSON.stringify({ transactionId, blockNumber: this.state.lastProcessedBlock, correlationId })
      ]
    );

    // Update allocation balance
    if (event.payload.allocationId) {
      await this.db.query(
        `UPDATE allocations
         SET reserved_paise = reserved_paise - $1,
             disbursed_paise = disbursed_paise + $1
         WHERE id = $2`,
        [event.payload.amountPaise, event.payload.allocationId]
      );
    }
  }

  private async updateDisbursementFailed(event: any, transactionId: string, correlationId: string) {
    await this.db.query(
      `UPDATE disbursements
       SET status = 'FAILED',
           failure_reason = $2,
           proof = $3,
           updated_at = now()
       WHERE id = $1`,
      [
        event.entityId,
        event.payload.failureReason || 'Unknown',
        JSON.stringify({ transactionId, blockNumber: this.state.lastProcessedBlock, correlationId })
      ]
    );

    // Release allocation reservation
    if (event.payload.allocationId) {
      await this.db.query(
        `UPDATE allocations
         SET reserved_paise = reserved_paise - $1
         WHERE id = $2`,
        [event.payload.amountPaise, event.payload.allocationId]
      );
    }
  }

  private async updateDisbursementReversed(event: any, transactionId: string, correlationId: string) {
    await this.db.query(
      `UPDATE disbursements
       SET status = 'REVERSED',
           failure_reason = $2,
           proof = $3,
           updated_at = now()
       WHERE id = $1`,
      [
        event.entityId,
        event.payload.reason,
        JSON.stringify({ transactionId, blockNumber: this.state.lastProcessedBlock, correlationId })
      ]
    );

    // Update allocation balance
    if (event.payload.allocationId) {
      await this.db.query(
        `UPDATE allocations
         SET disbursed_paise = disbursed_paise - $1
         WHERE id = $2`,
        [event.payload.amountPaise, event.payload.allocationId]
      );
    }
  }

  private async updateFundsAllocated(event: any, transactionId: string, correlationId: string) {
    await this.db.query(
      `INSERT INTO allocations(id, source_id, scheme_id, district_code, owner_msp, amount_paise, reserved_paise, disbursed_paise, proof, created_at)
       VALUES($1, $2, $3, $4, $5, $6, 0, 0, $7, now())
       ON CONFLICT(id) DO UPDATE SET
         amount_paise = $6,
         proof = $7`,
      [
        event.entityId,
        event.payload.sourceId,
        event.payload.schemeId,
        event.payload.districtCode,
        event.payload.ownerMsp,
        event.payload.amountPaise,
        JSON.stringify({ transactionId, blockNumber: this.state.lastProcessedBlock, correlationId })
      ]
    );
  }

  private async updateBeneficiaryCommitted(event: any, transactionId: string, correlationId: string) {
    await this.db.query(
      `INSERT INTO beneficiaries(id, beneficiary_ref, district_code, scheme_id, promised_paise, proof, created_at)
       VALUES($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT(id) DO UPDATE SET
         promised_paise = $5,
         proof = $6`,
      [
        event.entityId,
        event.payload.beneficiaryRef,
        event.payload.districtCode,
        event.payload.schemeId,
        event.payload.promisedPaise || 0,
        JSON.stringify({ transactionId, blockNumber: this.state.lastProcessedBlock, correlationId })
      ]
    );
  }

  private async handleSyncError(error: any) {
    this.logger.error(`Handling sync error: ${error}`);
    
    // Implement retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs * attempt));
        await this.sync();
        return;
      } catch (retryError) {
        this.logger.error(`Retry attempt ${attempt} failed: ${retryError}`);
      }
    }
    
    this.logger.error('Max retries exceeded, giving up');
  }

  // Public methods for health checks and monitoring
  getState(): IndexerState {
    return { ...this.state };
  }

  async getHealthStatus() {
    return {
      ledgerMode: process.env.LEDGER_MODE || 'memory',
      indexerActive: process.env.LEDGER_MODE === 'fabric',
      lastProcessedBlock: this.state.lastProcessedBlock,
      projectionLag: this.state.projectionLag,
      lastSyncTime: this.state.lastSyncTime,
      isProcessing: this.state.isProcessing
    };
  }

  async rebuildProjections(fromBlock: number = 0) {
    this.logger.log(`Starting projection rebuild from block ${fromBlock}`);
    
    try {
      // Set indexer status to rebuilding
      try {
        await this.db.query(
          "UPDATE indexer_checkpoint SET indexer_status = 'rebuilding', updated_at = now() WHERE id = 1"
        );
      } catch (columnError) {
        // Ignore if column doesn't exist
      }

      // Create rebuild tracking record
      try {
        await this.db.query(
          `INSERT INTO projection_rebuilds(from_block, status, started_at) 
           VALUES($1, 'in_progress', now())`,
          [fromBlock]
        );
      } catch (tableError) {
        // Ignore if table doesn't exist
      }

      // Clear existing projections (except schema tables)
      await this.db.query('DELETE FROM ledger_events WHERE block_number >= $1', [fromBlock]);
      
      // Reset checkpoint
      await this.db.query('UPDATE indexer_checkpoint SET block_number = $1, updated_at = now() WHERE id = 1', [fromBlock - 1]);
      
      // Reset state
      this.state.lastProcessedBlock = fromBlock - 1;
      
      // Process blocks directly without calling sync() to avoid circular reference
      await this.processBlocks();
      
      // Update rebuild status to completed
      try {
        await this.db.query(
          `UPDATE projection_rebuilds 
           SET status = 'completed', completed_at = now() 
           WHERE from_block = $1 AND status = 'in_progress'`,
          [fromBlock]
        );
      } catch (tableError) {
        // Ignore if table doesn't exist
      }

      // Reset indexer status to active
      try {
        await this.db.query(
          "UPDATE indexer_checkpoint SET indexer_status = 'active', updated_at = now() WHERE id = 1"
        );
      } catch (columnError) {
        // Ignore if column doesn't exist
      }
      
      this.logger.log('Projection rebuild completed');
    } catch (error) {
      this.logger.error(`Projection rebuild failed: ${error}`);
      
      // Update rebuild status to failed
      try {
        await this.db.query(
          `UPDATE projection_rebuilds 
           SET status = 'failed', completed_at = now(), error_message = $1 
           WHERE from_block = $2 AND status = 'in_progress'`,
          [error instanceof Error ? error.message : 'Unknown error', fromBlock]
        );
      } catch (tableError) {
        // Ignore if table doesn't exist
      }

      // Reset indexer status to error
      try {
        await this.db.query(
          "UPDATE indexer_checkpoint SET indexer_status = 'error', updated_at = now() WHERE id = 1"
        );
      } catch (columnError) {
        // Ignore if column doesn't exist
      }
      
      throw error;
    }
  }
}
