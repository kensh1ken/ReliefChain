import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SessionUser } from './auth';
import { DatabaseService } from './database.service';
import type { LedgerPort } from './ports';
import { LEDGER_PORT } from './ports';
import { requireOrganization } from './authorization';

@Injectable()
export class FundsService {
  constructor(private db: DatabaseService, @Inject(LEDGER_PORT) private ledger: LedgerPort) {}

  async createFundSource(input: any, user: SessionUser) {
    if (user.role === 'NGO' && input.sourceType !== 'NGO') throw new ForbiddenException('NGOs can only register NGO funds');
    const id = input.id ?? randomUUID();
    const proof = await this.ledger.submit('CreateFundSource', [id, input.disasterId, input.sourceType, input.name, String(input.amountPaise)],
      { name: 'FundSourceCreated', entityType: 'fundSource', entityId: id, payload: { ...input, id, ownerMsp: user.orgMsp } });
    await this.db.query(`INSERT INTO fund_sources(id,disaster_id,name,source_type,owner_msp,amount_paise,proof) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [id, input.disasterId, input.name, input.sourceType, user.orgMsp, input.amountPaise, proof]);
    return { id, ...input, proof };
  }

  async allocate(input: any, user: SessionUser) {
    const id = input.id ?? randomUUID();
    return this.db.transaction(async (client) => {
      const result = await client.query<any>('SELECT * FROM fund_sources WHERE id=$1 FOR UPDATE', [input.sourceId]); const source = result.rows[0];
      if (!source) throw new Error('Fund source not found');
      requireOrganization(user, source.owner_msp);
      if (Number(source.allocated_paise) + input.amountPaise > Number(source.amount_paise)) throw new Error('Allocation exceeds available source balance');
      const proof = await this.ledger.submit('AllocateFunds', [id, input.sourceId, input.schemeId, input.districtCode, String(input.amountPaise)],
        { name: 'FundsAllocated', entityType: 'allocation', entityId: id, payload: { ...input, id, ownerMsp: user.orgMsp } });
      await client.query('UPDATE fund_sources SET allocated_paise=allocated_paise+$1 WHERE id=$2', [input.amountPaise, input.sourceId]);
      await client.query(`INSERT INTO allocations(id,source_id,scheme_id,district_code,owner_msp,amount_paise,proof) VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, input.sourceId, input.schemeId, input.districtCode, user.orgMsp, input.amountPaise, proof]);
      return { id, ...input, proof };
    });
  }
}