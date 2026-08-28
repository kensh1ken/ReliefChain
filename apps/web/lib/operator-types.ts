export type Disaster = {
  id: string;
  name: string;
};

export type Scheme = {
  id: string;
  name: string;
};

export type FundSource = {
  id: string;
  name: string;
  amount_paise: number;
  allocated_paise: number;
};

export type Allocation = {
  id: string;
  district_code: string;
  amount_paise: number;
  reserved_paise: number;
  disbursed_paise: number;
};

export type Beneficiary = {
  id: string;
  district_code: string;
  beneficiary_ref: string;
};

export type Disbursement = {
  id: string;
  public_reference: string;
  amount_paise: number;
  status: string;
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