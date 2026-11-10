export function isValidLinkedInProfileUrl(url: string | null | undefined): boolean {
  if (url == null) return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = trimmed.startsWith('http') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return (
      parsed.hostname.replace(/^www\./, '') === 'linkedin.com' &&
      /^\/in\/[^/]+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function normaliseLinkedInProfileUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  const parsed = trimmed.startsWith('http') ? new URL(trimmed) : new URL(`https://${trimmed}`);
  parsed.hostname = 'linkedin.com';
  parsed.protocol = 'https:';
  return parsed.toString().replace(/\/$/, '');
}
