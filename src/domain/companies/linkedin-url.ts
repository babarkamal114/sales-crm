export function isValidLinkedInCompanyUrl(url: string | null | undefined): boolean {
  if (url == null) return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = trimmed.startsWith('http') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return (
      parsed.hostname.replace(/^www\./, '') === 'linkedin.com' &&
      /^\/company\/[^/]+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}
