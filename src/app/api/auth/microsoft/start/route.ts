import { NextResponse } from 'next/server';
import {
  buildMicrosoftAuthorizationUrl,
  isMicrosoftOAuthMode,
  microsoftAuthLandingPath,
  type MicrosoftOAuthMode,
} from '@/lib/auth/microsoft-oauth';
import { setMicrosoftOAuthStateCookie } from '@/server/auth/microsoft-oauth-cookies';
import {
  getAppUrl,
  getMicrosoftOAuthRedirectUri,
  getMicrosoftSsoEnv,
  isMicrosoftSsoConfigured,
} from '@/server/env';

function redirectToAuth(mode: MicrosoftOAuthMode, error?: string) {
  return NextResponse.redirect(
    new URL(microsoftAuthLandingPath(mode, error), getAppUrl()),
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const modeParam = requestUrl.searchParams.get('mode');
  const mode: MicrosoftOAuthMode = isMicrosoftOAuthMode(modeParam)
    ? modeParam
    : 'sign-in';

  if (!isMicrosoftSsoConfigured()) {
    return redirectToAuth(mode, 'not_configured');
  }

  try {
    const { MICROSOFT_SSO_CLIENT_ID, MICROSOFT_SSO_TENANT_ID } =
      getMicrosoftSsoEnv();
    const state = await setMicrosoftOAuthStateCookie(mode);
    const authorizeUrl = buildMicrosoftAuthorizationUrl({
      clientId: MICROSOFT_SSO_CLIENT_ID,
      tenantId: MICROSOFT_SSO_TENANT_ID,
      redirectUri: getMicrosoftOAuthRedirectUri(),
      state,
    });

    return NextResponse.redirect(authorizeUrl);
  } catch {
    return redirectToAuth(mode, 'failed');
  }
}
