import 'server-only';

import { GOOGLE_TOKEN_URL } from '@/lib/auth/google-oauth';
import { getGoogleAuthEnv } from '@/server/env';

export async function refreshGoogleMailAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn?: number;
}> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = getGoogleAuthEnv();
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error ?? 'Google token refresh failed');
  }

  return {
    accessToken: payload.access_token,
    ...(payload.expires_in ? { expiresIn: payload.expires_in } : {}),
  };
}
