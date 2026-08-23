import type { ActorRole } from '@reliefchain/contracts';

export interface SessionUser { sub: string; role: ActorRole | 'BENEFICIARY'; orgMsp?: string; districtCode?: string; beneficiaryId?: string }