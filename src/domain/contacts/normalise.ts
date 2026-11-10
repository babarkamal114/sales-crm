/** UK-default email and phone normalisation for duplicate detection and storage. */

const UK_MOBILE_PATTERN = /^(?:\+44|0)7\d{9}$/;

export function normaliseEmail(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  if (!trimmed.includes('@')) return null;
  return trimmed;
}

/**
 * Normalise to E.164 with UK as default region.
 * Accepts 07…, +44…, and spaced formats.
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = `+${digits.slice(2)}`;
  }

  if (digits.startsWith('+')) {
    const e164 = `+${digits.slice(1).replace(/\D/g, '')}`;
    return e164.length >= 8 ? e164 : null;
  }

  const only = digits.replace(/\D/g, '');
  if (only.startsWith('44') && only.length >= 12) {
    return `+${only}`;
  }
  if (only.startsWith('0')) {
    return `+44${only.slice(1)}`;
  }
  if (only.startsWith('7') && only.length === 10) {
    return `+44${only}`;
  }

  return only.length >= 8 ? `+${only}` : null;
}

export function detectPhoneType(e164: string | null): 'mobile' | 'landline' | null {
  if (!e164) return null;
  const national = e164.startsWith('+44') ? `0${e164.slice(3)}` : e164;
  const compact = national.replace(/\D/g, '');
  if (UK_MOBILE_PATTERN.test(compact.startsWith('0') ? compact : `0${compact}`)) {
    return 'mobile';
  }
  return 'landline';
}
