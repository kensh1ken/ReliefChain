export type Disaster = {
  id: string;
  name: string;
  state_code?: string;
};

export type Scheme = {
  id: string;
  name: string;
  disaster_id?: string;
};

export type FundSource = {
  id: string;
  name: string;
  disaster_id: string;
  source_type: string;
  owner_msp: string;
  amount_paise: number;
  allocated_paise: number;
};

export type Allocation = {
  id: string;
  source_id: string;
  scheme_id: string;
  owner_msp: string;
  district_code: string;
  amount_paise: number;
  reserved_paise: number;
  disbursed_paise: number;
};

export type Beneficiary = {
  id: string;
  district_code: string;
  scheme_id: string;
  promised_paise: number;
  beneficiary_ref: string;
};

export type Disbursement = {
  id: string;
  public_reference: string;
  allocation_id: string;
  beneficiary_id: string;
  amount_paise: number;
  status: string;
  created_at?: string;
};

export type OperatorContext = {
  disasters: Disaster[];
  schemes: Scheme[];
  sources: FundSource[];
  allocations: Allocation[];
  beneficiaries: Beneficiary[];
  disbursements: Disbursement[];
};

export type OperatorUser = {
  displayName?: string;
  organization?: string;
  role?: string;
};
