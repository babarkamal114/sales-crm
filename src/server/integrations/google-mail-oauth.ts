import 'server-only';

import { GOOGLE_AUTHORIZE_URL, GOOGLE_TOKEN_URL } from '@/lib/auth/google-oauth';
import { GOOGLE_MAIL_SCOPES } from '@/lib/integrations/oauth-providers';
import { getAppUrl, getGoogleAuthEnv } from '@/server/env';

export function getGoogleMailIntegrationRedirectUri(): string {
  return `${getAppUrl()}/api/integrations/google_mail/callback`;
}

export function buildGoogleMailAuthorizationUrl(input: {
  state: string;
}): string {
  const { GOOGLE_CLIENT_ID } = getGoogleAuthEnv();
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getGoogleMailIntegrationRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_MAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: input.state,
  });
  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeGoogleMailCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  email: string;
}> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = getGoogleAuthEnv();
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: getGoogleMailIntegrationRedirectUri(),
    grant_type: 'authorization_code',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error ?? 'Google token exchange failed');
  }

  const profileResponse = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: { Authorization: `Bearer ${payload.access_token}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  const profile = (await profileResponse.json()) as { email?: string };
  const email = profile.email?.trim().toLowerCase();
  if (!email) {
    throw new Error('Could not read Google account email');
  }

  return {
    accessToken: payload.access_token,
    ...(payload.refresh_token ? { refreshToken: payload.refresh_token } : {}),
    ...(payload.expires_in ? { expiresIn: payload.expires_in } : {}),
    email,
  };
}
