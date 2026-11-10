import { decodeJwtPayload } from '@/lib/auth/decode-jwt-payload';

export const MICROSOFT_OAUTH_SCOPES = 'openid email profile';
export const MICROSOFT_PERSONAL_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad';

export const MICROSOFT_OAUTH_STATE_COOKIE = 'sponsoro_crm_microsoft_oauth';
export const MICROSOFT_PENDING_COOKIE = 'sponsoro_crm_microsoft_pending';
export const MICROSOFT_OAUTH_TTL_MS = 10 * 60 * 1000;

export type MicrosoftOAuthMode = 'sign-in' | 'sign-up';

export interface MicrosoftOAuthState {
  state: string;
  mode: MicrosoftOAuthMode;
  expiresAt: number;
}

export interface MicrosoftPendingProfile {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
  expiresAt: number;
}

export interface MicrosoftIdTokenClaims {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  sub?: string;
  tid?: string;
  email?: string;
  preferred_username?: string;
  upn?: string;
  name?: string;
}

const TENANT_GUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const ISSUER_PATTERN =
  /^https:\/\/login\.microsoftonline\.com\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\/v2\.0$/;

export function isMicrosoftOAuthMode(
  value: string | null,
): value is MicrosoftOAuthMode {
  return value === 'sign-in' || value === 'sign-up';
}

export { decodeJwtPayload };

export function microsoftAuthorizeUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`;
}

export function microsoftTokenUrl(tenantId: string): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
}

export function isMicrosoftIssuer(
  issuer: string | undefined,
  configuredTenant: string,
): boolean {
  if (!issuer) return false;
  const match = issuer.match(ISSUER_PATTERN);
  if (!match?.[1]) return false;

  const tokenTid = match[1].toLowerCase();
  const tenant = configuredTenant.trim().toLowerCase();

  if (tenant === 'common') return true;
  if (tenant === 'consumers') return tokenTid === MICROSOFT_PERSONAL_TENANT_ID;
  if (tenant === 'organizations') return tokenTid !== MICROSOFT_PERSONAL_TENANT_ID;
  if (TENANT_GUID.test(tenant)) return tokenTid === tenant;
  return false;
}

export function extractMicrosoftEmail(claims: MicrosoftIdTokenClaims): string | null {
  for (const candidate of [claims.email, claims.preferred_username, claims.upn]) {
    const email = candidate?.trim().toLowerCase();
    if (email?.includes('@')) return email;
  }
  return null;
}

export function validateMicrosoftIdTokenClaims(
  claims: MicrosoftIdTokenClaims,
  clientId: string,
  configuredTenant: string,
  now: Date = new Date(),
):
  | { ok: true; profile: Omit<MicrosoftPendingProfile, 'expiresAt'> }
  | { ok: false; reason: string } {
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const email = extractMicrosoftEmail(claims);

  if (!isMicrosoftIssuer(claims.iss, configuredTenant)) {
    return { ok: false, reason: 'invalid_issuer' };
  }
  if (!audience.includes(clientId)) {
    return { ok: false, reason: 'invalid_audience' };
  }
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now.getTime()) {
    return { ok: false, reason: 'expired' };
  }
  if (!claims.sub?.trim()) {
    return { ok: false, reason: 'missing_sub' };
  }
  if (TENANT_GUID.test(configuredTenant.trim()) && claims.tid) {
    if (claims.tid.trim().toLowerCase() !== configuredTenant.trim().toLowerCase()) {
      return { ok: false, reason: 'invalid_tenant' };
    }
  }
  if (!email) {
    return { ok: false, reason: 'missing_email' };
  }

  return {
    ok: true,
    profile: {
      sub: claims.sub.trim(),
      email,
      name: claims.name?.trim() || email.split('@')[0] || 'Microsoft user',
      emailVerified: true,
    },
  };
}

export function buildMicrosoftAuthorizationUrl(input: {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    response_mode: 'query',
    scope: MICROSOFT_OAUTH_SCOPES,
    state: input.state,
    prompt: 'select_account',
  });

  return `${microsoftAuthorizeUrl(input.tenantId)}?${params.toString()}`;
}

export function microsoftOAuthErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'cancelled':
    case 'access_denied':
      return 'Microsoft sign-in was cancelled.';
    case 'not_configured':
      return 'Microsoft sign-in is not available on this environment.';
    case 'invalid_state':
      return 'Microsoft sign-in expired. Try again.';
    case 'missing_email':
      return 'Microsoft did not return an email address. Use another Microsoft account or sign up with email.';
    case 'account_not_found':
      return 'No CRM account matches that Microsoft email. Create an account first.';
    case 'expired':
      return 'Microsoft sign-in expired before you finished. Start again.';
    case 'failed':
      return 'Could not complete Microsoft sign-in. Try again.';
    default:
      return null;
  }
}

export function microsoftAuthLandingPath(
  mode: MicrosoftOAuthMode,
  error?: string,
): string {
  const path = mode === 'sign-up' ? '/sign-up' : '/sign-in';
  if (!error) return path;
  return `${path}?${new URLSearchParams({ microsoft: error }).toString()}`;
}
