export const SESSION_COOKIE_NAME = 'sponsoro_crm_session';
export const ACTIVE_ORG_COOKIE_NAME = 'sponsoro_crm_org';

export const SESSION_DURATION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_DURATION_DEFAULT_MS = 24 * 60 * 60 * 1000;

export function resolveSessionDurationMs(rememberMe: boolean): number {
  return rememberMe ? SESSION_DURATION_REMEMBER_MS : SESSION_DURATION_DEFAULT_MS;
}

export function sessionExpiresAt(rememberMe: boolean, now = new Date()): Date {
  return new Date(now.getTime() + resolveSessionDurationMs(rememberMe));
}

export function slugifyOrganisationName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return base.length > 0 ? base : 'workspace';
}

export {
  isPublicPath,
  isDevToolPath,
  PUBLIC_PATH_PREFIXES,
} from '@/lib/auth-paths';
