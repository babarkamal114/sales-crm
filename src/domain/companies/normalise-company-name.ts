const LEGAL_SUFFIXES =
  /\b(limited|ltd|llp|plc|inc|incorporated|corp|corporation|co|company|& co|and co)\.?$/gi;

export function normaliseCompanyName(name: string | null | undefined): string {
  if (name == null) return '';
  let value = name.trim().toLowerCase();
  if (!value) return '';

  value = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  value = value.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  value = value.replace(/\s+/g, ' ').trim();

  let prev = '';
  while (prev !== value) {
    prev = value;
    value = value.replace(LEGAL_SUFFIXES, '').trim();
  }

  return value.replace(/\s+/g, ' ').trim();
}
