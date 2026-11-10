const E164 = /^\+[1-9]\d{7,14}$/;

/** Normalise optional phone to E.164 or return undefined when empty. */
export function normalizePhoneE164(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  let candidate = trimmed.replace(/[\s()-]/g, '');
  if (!candidate.startsWith('+')) {
    if (candidate.startsWith('00')) {
      candidate = `+${candidate.slice(2)}`;
    } else if (candidate.startsWith('0')) {
      candidate = `+44${candidate.slice(1)}`;
    } else {
      candidate = `+${candidate}`;
    }
  }

  if (!E164.test(candidate)) {
    return undefined;
  }
  return candidate;
}

export function isValidPhoneE164(raw: string): boolean {
  return E164.test(raw.trim());
}
