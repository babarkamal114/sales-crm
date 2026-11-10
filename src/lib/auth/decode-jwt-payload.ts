export function decodeJwtPayload<T = Record<string, unknown>>(
  jwt: string,
): T | null {
  const parts = jwt.split('.');

  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
