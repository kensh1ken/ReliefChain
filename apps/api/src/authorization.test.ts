import { describe, expect, it } from 'vitest';
import { requireDistrict, requireOrganization } from './authorization';

const operator = { sub: 'user', role: 'GOVERNMENT' as const, orgMsp: 'GovernmentMSP', districtCode: 'AS-KAM' };
describe('authorization policies', () => {
  it('enforces organization and district scope', () => {
    expect(() => requireOrganization(operator, 'NgoMSP')).toThrow('another organization');
    expect(() => requireDistrict(operator, 'AS-BRP')).toThrow('another district');
    expect(() => requireOrganization(operator, 'GovernmentMSP')).not.toThrow();
    expect(() => requireDistrict(operator, 'AS-KAM')).not.toThrow();
  });
});