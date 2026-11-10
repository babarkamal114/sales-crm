import { NextResponse } from 'next/server';
import {
  microsoftAuthLandingPath,
  type MicrosoftOAuthMode,
  type MicrosoftPendingProfile,
} from '@/lib/auth/microsoft-oauth';
import { exchangeMicrosoftAuthorizationCode } from '@/lib/auth/microsoft-oauth-token';
import {
  clearMicrosoftOAuthStateCookie,
  clearMicrosoftPendingProfileCookie,
  readMicrosoftOAuthStateCookie,
  setMicrosoftPendingProfileCookie,
} from '@/server/auth/microsoft-oauth-cookies';
import {
  establishOAuthSession,
  findUserByEmail,
  findUserByMicrosoftSub,
  isActiveAuthUser,
  linkMicrosoftIdentity,
} from '@/server/auth/oauth-session';
import { getAppUrl } from '@/server/env';
import type { User } from '@/server/db/schema';

function redirectToAuth(mode: MicrosoftOAuthMode, error?: string) {
  return NextResponse.redirect(
    new URL(microsoftAuthLandingPath(mode, error), getAppUrl()),
  );
}

async function resolveMicrosoftUser(
  profile: Omit<MicrosoftPendingProfile, 'expiresAt'>,
): Promise<
  | { kind: 'existing'; user: User }
  | { kind: 'new' }
  | { kind: 'error'; code: string }
> {
  const bySub = await findUserByMicrosoftSub(profile.sub);

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
    if (byEmail.microsoftSub && byEmail.microsoftSub !== profile.sub) {
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
  const pendingState = await readMicrosoftOAuthStateCookie();
  const mode: MicrosoftOAuthMode = pendingState?.mode ?? 'sign-in';

  if (oauthError === 'access_denied') {
    await clearMicrosoftOAuthStateCookie();
    return redirectToAuth(mode, 'cancelled');
  }

  if (oauthError) {
    await clearMicrosoftOAuthStateCookie();
    return redirectToAuth(mode, 'failed');
  }

  if (!code || !state || !pendingState || pendingState.state !== state) {
    await clearMicrosoftOAuthStateCookie();
    return redirectToAuth(mode, 'invalid_state');
  }

  try {
    const profile = await exchangeMicrosoftAuthorizationCode(code);
    const resolved = await resolveMicrosoftUser(profile);

    if (resolved.kind === 'error') {
      await clearMicrosoftOAuthStateCookie();
      return redirectToAuth(mode, resolved.code);
    }

    if (resolved.kind === 'existing') {
      await linkMicrosoftIdentity(resolved.user, profile);
      const session = await establishOAuthSession(resolved.user);
      await clearMicrosoftOAuthStateCookie();
      await clearMicrosoftPendingProfileCookie();
      return NextResponse.redirect(new URL(session.redirectTo, getAppUrl()));
    }

    if (mode === 'sign-in') {
      await clearMicrosoftOAuthStateCookie();
      return redirectToAuth('sign-in', 'account_not_found');
    }

    await setMicrosoftPendingProfileCookie(profile);
    await clearMicrosoftOAuthStateCookie();
    return NextResponse.redirect(new URL('/sign-up/microsoft', getAppUrl()));
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'failed';
    await clearMicrosoftOAuthStateCookie();

    if (reason === 'missing_email') {
      return redirectToAuth(mode, 'missing_email');
    }
    if (reason === 'expired') {
      return redirectToAuth(mode, 'expired');
    }
    return redirectToAuth(mode, 'failed');
  }
}
