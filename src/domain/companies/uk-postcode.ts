/** UK postcode format (lenient, uppercase-insensitive). */
const UK_POSTCODE =
  /^([A-Z]{1,2}\d[A-Z\d]?|\d[A-Z]{2})\s*\d[A-Z]{2}$/i;

export function isValidUkPostcode(postcode: string | null | undefined): boolean {
  if (postcode == null) return true;
  const trimmed = postcode.trim();
  if (!trimmed) return true;
  return UK_POSTCODE.test(trimmed.replace(/\s+/g, ' '));
}

export function formatUkPostcode(postcode: string): string {
  const compact = postcode.replace(/\s+/g, '').toUpperCase();
  if (compact.length <= 3) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`.trim();
}
