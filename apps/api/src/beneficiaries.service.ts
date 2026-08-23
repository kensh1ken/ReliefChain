import { createHash, randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { beneficiaryReference, decryptPii, encryptPii } from '@reliefchain/contracts';
import type { SessionUser } from './auth';
import { DatabaseService } from './database.service';
import type { LedgerPort } from './ports';
import { LEDGER_PORT } from './ports';

function requireSecrets() {
  const encryptionKey = process.env.PII_ENCRYPTION_KEY, hmacSecret = process.env.BENEFICIARY_HMAC_SECRET;
  if (!encryptionKey || !hmacSecret) throw new Error('PII_ENCRYPTION_KEY and BENEFICIARY_HMAC_SECRET are required');
  return { encryptionKey, hmacSecret };
}

@Injectable()
export class BeneficiariesService {
  constructor(private db: DatabaseService, @Inject(LEDGER_PORT) private ledger: LedgerPort) {}

  async registerBeneficiary(input: any, user: SessionUser) {
    const id = input.id ?? randomUUID(), { encryptionKey, hmacSecret } = requireSecrets();
    if (user.districtCode && user.districtCode !== input.districtCode) throw new ForbiddenException('Operator is restricted to another district');
    const beneficiaryRef = beneficiaryReference(input.aadhaar, hmacSecret), phone = input.phone.replace(/\s/g, '');
    const proof = await this.ledger.submit('RegisterBeneficiaryCommitment', [beneficiaryRef, input.districtCode, input.schemeId],
      { name: 'BeneficiaryCommitted', entityType: 'beneficiaryCommitment', entityId: beneficiaryRef, payload: { districtCode: input.districtCode, schemeId: input.schemeId, ownerMsp: user.orgMsp } });
    await this.db.query(`INSERT INTO beneficiaries(id,beneficiary_ref,name_enc,phone_enc,phone_hash,district_code,scheme_id,promised_paise,proof)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, beneficiaryRef, encryptPii(input.name, encryptionKey), encryptPii(phone, encryptionKey),
      createHash('sha256').update(phone).digest('hex'), input.districtCode, input.schemeId, input.promisedPaise ?? 0, proof]);
    return { id, beneficiaryRef, districtCode: input.districtCode, schemeId: input.schemeId, proof };
  }

  async view(id: string) {
    const { encryptionKey } = requireSecrets(); const b = (await this.db.query<any>('SELECT b.*,s.name scheme_name FROM beneficiaries b JOIN schemes s ON s.id=b.scheme_id WHERE b.id=$1', [id])).rows[0];
    if (!b) throw new NotFoundException();
    const payouts = await this.db.query<any>('SELECT public_reference,amount_paise,status,bank_reference,proof,created_at,updated_at FROM disbursements WHERE beneficiary_id=$1 ORDER BY created_at DESC', [id]);
    return { name: decryptPii(b.name_enc, encryptionKey), districtCode: b.district_code, schemeName: b.scheme_name, promisedPaise: Number(b.promised_paise),
      payments: payouts.rows.map((p) => ({ ...p, amount_paise: Number(p.amount_paise) })) };
  }
}