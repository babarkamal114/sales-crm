import 'server-only';

import {
  GOOGLE_TOKEN_URL,
  decodeJwtPayload,
  validateGoogleIdTokenClaims,
  type GoogleIdTokenClaims,
  type GooglePendingProfile,
} from '@/lib/auth/google-oauth';
import {
  getGoogleAuthEnv,
  getGoogleOAuthRedirectUri,
} from '@/server/env';

const REQUEST_TIMEOUT_MS = 15_000;

export async function exchangeGoogleAuthorizationCode(
  code: string,
): Promise<Omit<GooglePendingProfile, 'expiresAt'>> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = getGoogleAuthEnv();
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: getGoogleOAuthRedirectUri(),
    grant_type: 'authorization_code',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload = (await response.json()) as {
    id_token?: string;
    error?: string;
  };

  if (!response.ok || !payload.id_token) {
    throw new Error(payload.error ?? `google_token_${response.status}`);
  }

  const claims = decodeJwtPayload<GoogleIdTokenClaims>(payload.id_token);

  if (!claims) {
    throw new Error('invalid_id_token');
  }

  const validated = validateGoogleIdTokenClaims(claims, GOOGLE_CLIENT_ID);

  if (!validated.ok) {
    throw new Error(validated.reason);
  }

  return validated.profile;
}
