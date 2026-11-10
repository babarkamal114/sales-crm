const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

function stripTrailingDot(value: string): string {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

function hostFromEmail(input: string): string | null {
  const at = input.lastIndexOf('@');
  if (at <= 0 || at === input.length - 1) return null;
  return input.slice(at + 1);
}

function tryPunycodeAscii(host: string): string {
  return host;
}

/**
 * Accepts URL, email or bare domain. Returns normalised ASCII hostname or null.
 */
export function normaliseDomain(input: string | null | undefined): string | null {
  if (input == null) return null;
  let raw = input.trim().toLowerCase();
  if (!raw) return null;

  if (raw.includes('@')) {
    const host = hostFromEmail(raw);
    if (!host) return null;
    raw = host;
  }

  if (raw.includes('://') || raw.startsWith('//')) {
    try {
      const url = raw.startsWith('//') ? new URL(`https:${raw}`) : new URL(raw);
      raw = url.hostname;
    } catch {
      return null;
    }
  } else if (raw.includes('/') || raw.includes('?')) {
    try {
      raw = new URL(`https://${raw}`).hostname;
    } catch {
      return null;
    }
  }

  raw = stripTrailingDot(raw);
  if (raw.startsWith('www.')) {
    raw = raw.slice(4);
  }

  const colon = raw.indexOf(':');
  if (colon > -1) {
    raw = raw.slice(0, colon);
  }

  raw = tryPunycodeAscii(raw);
  raw = stripTrailingDot(raw);

  if (!raw || raw.includes(' ') || !DOMAIN_LABEL.test(raw)) {
    return null;
  }

  return raw;
}
