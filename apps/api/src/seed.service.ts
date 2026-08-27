import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { DatabaseService } from './database.service';
import { LedgerService, ledgerErrorHasCode } from './ledger';
import { ReliefService } from './relief.service';

const ids = {
  disaster: '10000000-0000-4000-8000-000000000001', schemeHousing: '20000000-0000-4000-8000-000000000001', schemeCash: '20000000-0000-4000-8000-000000000002',
  govSource: '30000000-0000-4000-8000-000000000001', ngoSource: '30000000-0000-4000-8000-000000000002',
  govAllocation: '40000000-0000-4000-8000-000000000001', ngoAllocation: '40000000-0000-4000-8000-000000000002'
};
const government = { sub: 'seed-gov', role: 'GOVERNMENT' as const, orgMsp: 'GovernmentMSP' };
const ngo = { sub: 'seed-ngo', role: 'NGO' as const, orgMsp: 'NgoMSP' };

@Injectable()
export class SeedService {
  constructor(private db: DatabaseService, private ledger: LedgerService, private relief: ReliefService) {}
  private async existingAsset(type: string, id: string) {
    try { return await this.ledger.evaluate('ReadAsset', [type, id]) as Record<string, unknown> | null; }
    catch (error) { if (ledgerErrorHasCode(error, 'LEDGER_NOT_FOUND')) return null; throw error; }
  }
  async run() {
    const primaryPhone = process.env.DEMO_BENEFICIARY_PHONE;
    if (!primaryPhone) throw new Error('DEMO_BENEFICIARY_PHONE is required for demo seeding');
    const phoneFor = (index: number) => `${primaryPhone.slice(0, -2)}${String((Number(primaryPhone.slice(-2)) + index) % 100).padStart(2, '0')}`;
    const aadhaarFor = (index: number) => Array.from(createHash('sha256').update(`reliefchain-assam-${index}`).digest()).map((byte) => byte % 10).join('').slice(0, 12);
    const passwordHash = await argon2.hash('Relief@123');
    for (const user of [
      ['gov@reliefchain.demo', 'Assam Relief Officer', 'GOVERNMENT', 'GovernmentMSP'],
      ['ngo@reliefchain.demo', 'Relief NGO Coordinator', 'NGO', 'NgoMSP'],
      ['auditor@reliefchain.demo', 'CAG Demo Auditor', 'AUDITOR', 'AuditorMSP']
    ]) await this.db.query(`INSERT INTO users(email,password_hash,display_name,role,org_msp) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash`, [user[0], passwordHash, user[1], user[2], user[3]]);

    if (!(await this.db.query('SELECT 1 FROM disasters WHERE id=$1', [ids.disaster])).rowCount) {
      await this.ledger.submit('RegisterDisaster', [ids.disaster, 'Assam Flood Response 2026', 'AS'], { name: 'DisasterRegistered', entityType: 'disaster', entityId: ids.disaster, actorMsp: 'GovernmentMSP', payload: { stateCode: 'AS' } }, `seed:disaster:${ids.disaster}`);
      await this.db.query('INSERT INTO disasters(id,name,state_code) VALUES($1,$2,$3)', [ids.disaster, 'Assam Flood Response 2026', 'AS']);
    }
    for (const [id, name] of [[ids.schemeHousing, 'Flood Home Recovery Grant'], [ids.schemeCash, 'Emergency Family Cash Assistance']]) {
      if (!(await this.db.query('SELECT 1 FROM schemes WHERE id=$1', [id])).rowCount) {
        await this.ledger.submit('RegisterScheme', [id, ids.disaster, name], { name: 'SchemeRegistered', entityType: 'scheme', entityId: id, actorMsp: 'GovernmentMSP', payload: { disasterId: ids.disaster } }, `seed:scheme:${id}`);
        await this.db.query('INSERT INTO schemes(id,disaster_id,name) VALUES($1,$2,$3)', [id, ids.disaster, name]);
      }
    }
    if (!(await this.db.query('SELECT 1 FROM fund_sources WHERE id=$1', [ids.govSource])).rowCount) {
      await this.relief.createFundSource({ id: ids.govSource, disasterId: ids.disaster, name: 'Assam State Flood Relief Fund', sourceType: 'STATE_GOVERNMENT', amountPaise: 15_000_000_00 }, government, `seed:source:${ids.govSource}`);
    }
    if (!(await this.db.query('SELECT 1 FROM fund_sources WHERE id=$1', [ids.ngoSource])).rowCount) {
      await this.relief.createFundSource({ id: ids.ngoSource, disasterId: ids.disaster, name: 'North East Community Relief Pool', sourceType: 'NGO', amountPaise: 5_000_000_00 }, ngo, `seed:source:${ids.ngoSource}`);
    }
    if (!(await this.db.query('SELECT 1 FROM allocations WHERE id=$1', [ids.govAllocation])).rowCount) {
      await this.relief.allocate({ id: ids.govAllocation, sourceId: ids.govSource, schemeId: ids.schemeCash, districtCode: 'AS-KAM', amountPaise: 7_500_000_00 }, government, `seed:allocation:${ids.govAllocation}`);
    }
    if (!(await this.db.query('SELECT 1 FROM allocations WHERE id=$1', [ids.ngoAllocation])).rowCount) {
      await this.relief.allocate({ id: ids.ngoAllocation, sourceId: ids.ngoSource, schemeId: ids.schemeHousing, districtCode: 'AS-BRP', amountPaise: 3_000_000_00 }, ngo, `seed:allocation:${ids.ngoAllocation}`);
    }
    const people = [
      ['70000000-0000-4000-8000-000000000001','Anima Das',phoneFor(0),aadhaarFor(0),'AS-KAM',ids.schemeCash,government,ids.govAllocation,'SETTLED'],
      ['70000000-0000-4000-8000-000000000002','Ranjit Kalita',phoneFor(1),aadhaarFor(1),'AS-KAM',ids.schemeCash,government,ids.govAllocation,'SETTLED'],
      ['70000000-0000-4000-8000-000000000003','Mina Begum',phoneFor(2),aadhaarFor(2),'AS-KAM',ids.schemeCash,government,ids.govAllocation,'FAILED'],
      ['70000000-0000-4000-8000-000000000004','Pradip Roy',phoneFor(3),aadhaarFor(3),'AS-BRP',ids.schemeHousing,ngo,ids.ngoAllocation,'SETTLED'],
      ['70000000-0000-4000-8000-000000000005','Juri Nath',phoneFor(4),aadhaarFor(4),'AS-BRP',ids.schemeHousing,ngo,ids.ngoAllocation,'SETTLED'],
      ['70000000-0000-4000-8000-000000000006','Rahima Khatun',phoneFor(5),aadhaarFor(5),'AS-BRP',ids.schemeHousing,ngo,ids.ngoAllocation,'SETTLED']
    ] as const;
    for (let i = 0; i < people.length; i++) {
      const [id,name,phone,aadhaar,districtCode,schemeId,actor,allocationId,outcome] = people[i];
      if (!(await this.db.query('SELECT 1 FROM beneficiaries WHERE id=$1', [id])).rowCount) {
        await this.relief.registerBeneficiary({ id, name, phone, aadhaar, districtCode, schemeId, promisedPaise: 25_000_00 }, actor, `seed:beneficiary:${id}`);
      }
      const disbursementId = `80000000-0000-4000-8000-00000000000${i + 1}`;
      if (!(await this.db.query('SELECT 1 FROM disbursements WHERE id=$1', [disbursementId])).rowCount) {
        const existingDisbursement = await this.existingAsset('disbursement', disbursementId);
        const publicReference = typeof existingDisbursement?.publicReference === 'string' ? existingDisbursement.publicReference : `RC-2026-SEED000${i + 1}`;
        await this.relief.initiateDisbursement({ id: disbursementId, publicReference, existingLedgerStatus: existingDisbursement?.status, beneficiaryId: id, allocationId, amountPaise: 25_000_00, idempotencyKey: `assam-demo-payment-${i + 1}`, simulatedOutcome: outcome }, actor, `seed:disbursement:${disbursementId}`);
      }
    }
    return { seeded: true, demo: { operatorAccountsCreated: true, beneficiaryConfigured: true } };
  }
}
