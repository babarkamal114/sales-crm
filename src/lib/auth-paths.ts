export const SESSION_COOKIE_NAME = 'sponsoro_crm_session';
export const ACTIVE_ORG_COOKIE_NAME = 'sponsoro_crm_org';

export const PUBLIC_PATH_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/api/webhooks',
  '/api/auth',
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isDevToolPath(pathname: string): boolean {
  return pathname === '/dev' || pathname.startsWith('/dev/');
}
