import 'server-only';

import { MICROSOFT_MAIL_SCOPES } from '@/lib/integrations/oauth-providers';
import { microsoftAuthorizeUrl, microsoftTokenUrl } from '@/lib/auth/microsoft-oauth';
import { getAppUrl, getMicrosoftSsoEnv } from '@/server/env';

export function getMicrosoftMailIntegrationRedirectUri(): string {
  return `${getAppUrl()}/api/integrations/microsoft_mail/callback`;
}

export function buildMicrosoftMailAuthorizationUrl(input: {
  state: string;
}): string {
  const { MICROSOFT_SSO_CLIENT_ID, MICROSOFT_SSO_TENANT_ID } = getMicrosoftSsoEnv();
  const params = new URLSearchParams({
    client_id: MICROSOFT_SSO_CLIENT_ID,
    redirect_uri: getMicrosoftMailIntegrationRedirectUri(),
    response_type: 'code',
    response_mode: 'query',
    scope: MICROSOFT_MAIL_SCOPES,
    state: input.state,
    prompt: 'consent',
  });
  return `${microsoftAuthorizeUrl(MICROSOFT_SSO_TENANT_ID)}?${params.toString()}`;
}

export async function exchangeMicrosoftMailCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  email: string;
}> {
  const {
    MICROSOFT_SSO_CLIENT_ID,
    MICROSOFT_SSO_CLIENT_SECRET,
    MICROSOFT_SSO_TENANT_ID,
  } = getMicrosoftSsoEnv();

  const body = new URLSearchParams({
    code,
    client_id: MICROSOFT_SSO_CLIENT_ID,
    client_secret: MICROSOFT_SSO_CLIENT_SECRET,
    redirect_uri: getMicrosoftMailIntegrationRedirectUri(),
    grant_type: 'authorization_code',
    scope: MICROSOFT_MAIL_SCOPES,
  });

  const response = await fetch(microsoftTokenUrl(MICROSOFT_SSO_TENANT_ID), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error ?? 'Microsoft token exchange failed');
  }

  const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${payload.access_token}` },
    signal: AbortSignal.timeout(15_000),
  });
  const profile = (await profileResponse.json()) as {
    mail?: string;
    userPrincipalName?: string;
  };
  const email = (profile.mail ?? profile.userPrincipalName)?.trim().toLowerCase();
  if (!email) {
    throw new Error('Could not read Microsoft account email');
  }

  return {
    accessToken: payload.access_token,
    ...(payload.refresh_token ? { refreshToken: payload.refresh_token } : {}),
    email,
  };
}
