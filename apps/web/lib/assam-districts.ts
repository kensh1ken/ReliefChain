export type AssamDistrict = {
  code: string;
  name: string;
};

export const ASSAM_DISTRICTS: AssamDistrict[] = [
  { code: 'AS-BAK', name: 'Baksa' },
  { code: 'AS-BRP', name: 'Barpeta' },
  { code: 'AS-BIS', name: 'Biswanath' },
  { code: 'AS-BON', name: 'Bongaigaon' },
  { code: 'AS-CAC', name: 'Cachar' },
  { code: 'AS-CHA', name: 'Charaideo' },
  { code: 'AS-CHI', name: 'Chirang' },
  { code: 'AS-DAR', name: 'Darrang' },
  { code: 'AS-DHE', name: 'Dhemaji' },
  { code: 'AS-DHU', name: 'Dhubri' },
  { code: 'AS-DIB', name: 'Dibrugarh' },
  { code: 'AS-DIM', name: 'Dima Hasao' },
  { code: 'AS-GOA', name: 'Goalpara' },
  { code: 'AS-GOL', name: 'Golaghat' },
  { code: 'AS-HAI', name: 'Hailakandi' },
  { code: 'AS-HOJ', name: 'Hojai' },
  { code: 'AS-JOR', name: 'Jorhat' },
  { code: 'AS-KAM', name: 'Kamrup' },
  { code: 'AS-KMA', name: 'Kamrup Metropolitan' },
  { code: 'AS-KAR', name: 'Karbi Anglong' },
  { code: 'AS-KMJ', name: 'Karimganj' },
  { code: 'AS-KRI', name: 'Kokrajhar' },
  { code: 'AS-LAK', name: 'Lakhimpur' },
  { code: 'AS-MAJ', name: 'Majuli' },
  { code: 'AS-MOR', name: 'Morigaon' },
  { code: 'AS-NAG', name: 'Nagaon' },
  { code: 'AS-NAL', name: 'Nalbari' },
  { code: 'AS-SIV', name: 'Sivasagar' },
  { code: 'AS-SON', name: 'Sonitpur' },
  { code: 'AS-SSM', name: 'South Salmara Mankachar' },
  { code: 'AS-TIN', name: 'Tinsukia' },
  { code: 'AS-UDL', name: 'Udalguri' },
  { code: 'AS-WES', name: 'West Karbi Anglong' },
];

const DISTRICT_ALIASES: Record<string, string> = {
  'AS-BAR': 'Barpeta',
  'AS-CHH': 'Charaideo',
  AS_BRP: 'Barpeta',
  AS_BAR: 'Barpeta',
  AS_CHH: 'Charaideo',
};

export const ASSAM_DISTRICT_CODE_TO_NAME: Record<string, string> = {
  ...Object.fromEntries(ASSAM_DISTRICTS.map(({ code, name }) => [code, name])),
  ...Object.fromEntries(ASSAM_DISTRICTS.map(({ code, name }) => [code.replace('-', '_'), name])),
  ...DISTRICT_ALIASES,
};

export function districtNameFromCode(code: string): string {
  return ASSAM_DISTRICT_CODE_TO_NAME[code] ?? code
    .replace(/^AS[-_]?/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
