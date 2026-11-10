import { NextResponse } from 'next/server';
import {
  buildGoogleAuthorizationUrl,
  googleAuthLandingPath,
  isGoogleOAuthMode,
  type GoogleOAuthMode,
} from '@/lib/auth/google-oauth';
import { setGoogleOAuthStateCookie } from '@/server/auth/google-oauth-cookies';
import {
  getAppUrl,
  getGoogleAuthEnv,
  getGoogleOAuthRedirectUri,
  isGoogleAuthConfigured,
} from '@/server/env';

function redirectToAuth(mode: GoogleOAuthMode, error?: string) {
  return NextResponse.redirect(
    new URL(googleAuthLandingPath(mode, error), getAppUrl()),
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const modeParam = requestUrl.searchParams.get('mode');
  const mode: GoogleOAuthMode = isGoogleOAuthMode(modeParam)
    ? modeParam
    : 'sign-in';

  if (!isGoogleAuthConfigured()) {
    return redirectToAuth(mode, 'not_configured');
  }

  try {
    const { GOOGLE_CLIENT_ID } = getGoogleAuthEnv();
    const state = await setGoogleOAuthStateCookie(mode);
    const authorizeUrl = buildGoogleAuthorizationUrl({
      clientId: GOOGLE_CLIENT_ID,
      redirectUri: getGoogleOAuthRedirectUri(),
      state,
    });

    return NextResponse.redirect(authorizeUrl);
  } catch {
    return redirectToAuth(mode, 'failed');
  }
}
