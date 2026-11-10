import 'server-only';

import {
  decodeJwtPayload,
  microsoftTokenUrl,
  validateMicrosoftIdTokenClaims,
  type MicrosoftIdTokenClaims,
  type MicrosoftPendingProfile,
} from '@/lib/auth/microsoft-oauth';
import {
  getMicrosoftOAuthRedirectUri,
  getMicrosoftSsoEnv,
} from '@/server/env';

const REQUEST_TIMEOUT_MS = 15_000;
const USERINFO_URL = 'https://graph.microsoft.com/oidc/userinfo';

async function fetchMicrosoftUserInfo(
  accessToken: string,
): Promise<
  Pick<MicrosoftIdTokenClaims, 'email' | 'name' | 'preferred_username'>
> {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    return {};
  }

  return (await response.json()) as Pick<
    MicrosoftIdTokenClaims,
    'email' | 'name' | 'preferred_username'
  >;
}

export async function exchangeMicrosoftAuthorizationCode(
  code: string,
): Promise<Omit<MicrosoftPendingProfile, 'expiresAt'>> {
  const {
    MICROSOFT_SSO_CLIENT_ID,
    MICROSOFT_SSO_CLIENT_SECRET,
    MICROSOFT_SSO_TENANT_ID,
  } = getMicrosoftSsoEnv();

  const body = new URLSearchParams({
    code,
    client_id: MICROSOFT_SSO_CLIENT_ID,
    client_secret: MICROSOFT_SSO_CLIENT_SECRET,
    redirect_uri: getMicrosoftOAuthRedirectUri(),
    grant_type: 'authorization_code',
    scope: 'openid email profile',
  });

  const response = await fetch(microsoftTokenUrl(MICROSOFT_SSO_TENANT_ID), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload = (await response.json()) as {
    id_token?: string;
    access_token?: string;
    error?: string;
  };

  if (!response.ok || !payload.id_token) {
    throw new Error(payload.error ?? `microsoft_token_${response.status}`);
  }

  const claims = decodeJwtPayload<MicrosoftIdTokenClaims>(payload.id_token);

  if (!claims) {
    throw new Error('invalid_id_token');
  }

  let validated = validateMicrosoftIdTokenClaims(
    claims,
    MICROSOFT_SSO_CLIENT_ID,
    MICROSOFT_SSO_TENANT_ID,
  );

  if (!validated.ok && validated.reason === 'missing_email' && payload.access_token) {
    const info = await fetchMicrosoftUserInfo(payload.access_token);
    const enriched: MicrosoftIdTokenClaims = { ...claims };
    const email = info.email ?? claims.email;
    const preferredUsername =
      info.preferred_username ?? claims.preferred_username;
    const name = info.name ?? claims.name;
    if (email !== undefined) enriched.email = email;
    if (preferredUsername !== undefined) {
      enriched.preferred_username = preferredUsername;
    }
    if (name !== undefined) enriched.name = name;

    validated = validateMicrosoftIdTokenClaims(
      enriched,
      MICROSOFT_SSO_CLIENT_ID,
      MICROSOFT_SSO_TENANT_ID,
    );
  }

  if (!validated.ok) {
    throw new Error(validated.reason);
  }

  return validated.profile;
}
