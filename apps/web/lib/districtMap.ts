export const DISTRICT_MAP: Record<
  string,
  string
> = {
  AS_KAM: 'Kamrup',
  AS_BRP: 'Barpeta',
};

export function getDistrictName(
  districtCode: string,
): string {
  return (
    DISTRICT_MAP[districtCode] ??
    districtCode
      .replace(/^AS_/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      )
  );
}