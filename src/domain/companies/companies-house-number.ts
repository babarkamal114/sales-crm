/** Companies House number: 8 digits or 2-letter prefix + 6 digits. */
const COMPANIES_HOUSE = /^(\d{8}|[A-Z]{2}\d{6})$/i;

export function isValidCompaniesHouseNumber(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return true;
  return COMPANIES_HOUSE.test(trimmed);
}

export function normaliseCompaniesHouseNumber(value: string): string {
  return value.trim().toUpperCase();
}
