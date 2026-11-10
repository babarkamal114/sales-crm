import { NextResponse } from 'next/server';
import {
  googleAuthLandingPath,
  type GoogleOAuthMode,
  type GooglePendingProfile,
} from '@/lib/auth/google-oauth';
import { exchangeGoogleAuthorizationCode } from '@/lib/auth/google-oauth-token';
import {
  clearGoogleOAuthStateCookie,
  clearGooglePendingProfileCookie,
  readGoogleOAuthStateCookie,
  setGooglePendingProfileCookie,
} from '@/server/auth/google-oauth-cookies';
import {
  establishOAuthSession,
  findUserByEmail,
  findUserByGoogleSub,
  isActiveAuthUser,
  linkGoogleIdentity,
} from '@/server/auth/oauth-session';
import { getAppUrl } from '@/server/env';
import type { User } from '@/server/db/schema';

function redirectToAuth(mode: GoogleOAuthMode, error?: string) {
  return NextResponse.redirect(
    new URL(googleAuthLandingPath(mode, error), getAppUrl()),
  );
}

async function resolveGoogleUser(
  profile: Omit<GooglePendingProfile, 'expiresAt'>,
): Promise<
  | { kind: 'existing'; user: User }
  | { kind: 'new' }
  | { kind: 'error'; code: string }
> {
  const bySub = await findUserByGoogleSub(profile.sub);

  if (bySub) {
    if (!isActiveAuthUser(bySub)) {
      return { kind: 'error', code: 'failed' };
    }
    return { kind: 'existing', user: bySub };
  }

  const byEmail = await findUserByEmail(profile.email);

  if (byEmail) {
    if (!isActiveAuthUser(byEmail)) {
      return { kind: 'error', code: 'failed' };
    }
    if (byEmail.googleSub && byEmail.googleSub !== profile.sub) {
      return { kind: 'error', code: 'failed' };
    }
    return { kind: 'existing', user: byEmail };
  }

  return { kind: 'new' };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const oauthError = requestUrl.searchParams.get('error');
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const pendingState = await readGoogleOAuthStateCookie();
  const mode: GoogleOAuthMode = pendingState?.mode ?? 'sign-in';

  if (oauthError === 'access_denied') {
    await clearGoogleOAuthStateCookie();
    return redirectToAuth(mode, 'cancelled');
  }

  if (oauthError) {
    await clearGoogleOAuthStateCookie();
    return redirectToAuth(mode, 'failed');
  }

  if (!code || !state || !pendingState || pendingState.state !== state) {
    await clearGoogleOAuthStateCookie();
    return redirectToAuth(mode, 'invalid_state');
  }

  try {
    const profile = await exchangeGoogleAuthorizationCode(code);
    const resolved = await resolveGoogleUser(profile);

    if (resolved.kind === 'error') {
      await clearGoogleOAuthStateCookie();
      return redirectToAuth(mode, resolved.code);
    }

    if (resolved.kind === 'existing') {
      await linkGoogleIdentity(resolved.user, profile);
      const session = await establishOAuthSession(resolved.user);
      await clearGoogleOAuthStateCookie();
      await clearGooglePendingProfileCookie();
      return NextResponse.redirect(new URL(session.redirectTo, getAppUrl()));
    }

    if (mode === 'sign-in') {
      await clearGoogleOAuthStateCookie();
      return redirectToAuth('sign-in', 'account_not_found');
    }

    await setGooglePendingProfileCookie(profile);
    await clearGoogleOAuthStateCookie();
    return NextResponse.redirect(new URL('/sign-up/google', getAppUrl()));
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'failed';
    await clearGoogleOAuthStateCookie();

    if (reason === 'email_unverified') {
      return redirectToAuth(mode, 'email_unverified');
    }
    if (reason === 'expired') {
      return redirectToAuth(mode, 'expired');
    }
    return redirectToAuth(mode, 'failed');
  }
}
