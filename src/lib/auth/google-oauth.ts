import { decodeJwtPayload } from '@/lib/auth/decode-jwt-payload';

export const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_OAUTH_SCOPES = 'openid email profile';

export const GOOGLE_OAUTH_STATE_COOKIE = 'sponsoro_crm_google_oauth';
export const GOOGLE_PENDING_COOKIE = 'sponsoro_crm_google_pending';
export const GOOGLE_OAUTH_TTL_MS = 10 * 60 * 1000;

export type GoogleOAuthMode = 'sign-in' | 'sign-up';

export interface GoogleOAuthState {
  state: string;
  mode: GoogleOAuthMode;
  expiresAt: number;
}

export interface GooglePendingProfile {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
  expiresAt: number;
}

export interface GoogleIdTokenClaims {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
}

export function isGoogleOAuthMode(value: string | null): value is GoogleOAuthMode {
  return value === 'sign-in' || value === 'sign-up';
}

export { decodeJwtPayload };

export function validateGoogleIdTokenClaims(
  claims: GoogleIdTokenClaims,
  clientId: string,
  now: Date = new Date(),
):
  | { ok: true; profile: Omit<GooglePendingProfile, 'expiresAt'> }
  | { ok: false; reason: string } {
  const issuer = claims.iss;
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const email = claims.email?.trim().toLowerCase();
  const emailVerified =
    claims.email_verified === true || claims.email_verified === 'true';

  if (issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
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

  if (!email) {
    return { ok: false, reason: 'missing_email' };
  }

  if (!emailVerified) {
    return { ok: false, reason: 'email_unverified' };
  }

  return {
    ok: true,
    profile: {
      sub: claims.sub.trim(),
      email,
      name: claims.name?.trim() || email.split('@')[0] || 'Google user',
      emailVerified: true,
    },
  };
}

export function buildGoogleAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES,
    state: input.state,
    prompt: 'select_account',
  });

  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

export function googleOAuthErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'cancelled':
    case 'access_denied':
      return 'Google sign-in was cancelled.';
    case 'not_configured':
      return 'Google sign-in is not available on this environment.';
    case 'invalid_state':
      return 'Google sign-in expired. Try again.';
    case 'email_unverified':
      return 'Google could not verify that email address. Use another Google account or sign up with email.';
    case 'account_not_found':
      return 'No CRM account matches that Google email. Create an account first.';
    case 'expired':
      return 'Google sign-in expired before you finished. Start again.';
    case 'failed':
      return 'Could not complete Google sign-in. Try again.';
    default:
      return null;
  }
}

export function googleAuthLandingPath(mode: GoogleOAuthMode, error?: string): string {
  const path = mode === 'sign-up' ? '/sign-up' : '/sign-in';
  if (!error) return path;
  return `${path}?${new URLSearchParams({ google: error }).toString()}`;
}
