import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getEnv } from '@/server/env';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_TTL_MS,
  GOOGLE_PENDING_COOKIE,
  type GoogleOAuthMode,
  type GoogleOAuthState,
  type GooglePendingProfile,
} from '@/lib/auth/google-oauth';

function shouldUseSecureSessionCookies(): boolean {
  if (getEnv().ALLOW_INSECURE_SESSION_COOKIES) return false;
  return getEnv().NODE_ENV === 'production';
}

function signPayload(payload: string): string {
  return createHmac('sha256', getEnv().SESSION_SECRET)
    .update(payload)
    .digest('base64url');
}

function encodeSigned(value: unknown): string {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${signPayload(payload)}`;
}

function decodeSigned<T>(raw: string, isValid: (value: T) => boolean): T | null {
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    provided.length !== expectedBuffer.length ||
    !timingSafeEqual(provided, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as T;
    if (!isValid(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: shouldUseSecureSessionCookies(),
    maxAge: maxAgeSeconds,
  };
}

export async function setGoogleOAuthStateCookie(
  mode: GoogleOAuthMode,
): Promise<string> {
  const state = randomBytes(32).toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    encodeSigned({
      state,
      mode,
      expiresAt: Date.now() + GOOGLE_OAUTH_TTL_MS,
    } satisfies GoogleOAuthState),
    cookieOptions(GOOGLE_OAUTH_TTL_MS / 1000),
  );
  return state;
}

export async function readGoogleOAuthStateCookie(): Promise<GoogleOAuthState | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!raw) return null;

  return decodeSigned<GoogleOAuthState>(
    raw,
    (value) =>
      typeof value.state === 'string' &&
      (value.mode === 'sign-in' || value.mode === 'sign-up') &&
      typeof value.expiresAt === 'number' &&
      value.expiresAt > Date.now(),
  );
}

export async function clearGoogleOAuthStateCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);
}

export async function setGooglePendingProfileCookie(
  profile: Omit<GooglePendingProfile, 'expiresAt'>,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    GOOGLE_PENDING_COOKIE,
    encodeSigned({
      ...profile,
      expiresAt: Date.now() + GOOGLE_OAUTH_TTL_MS,
    } satisfies GooglePendingProfile),
    cookieOptions(GOOGLE_OAUTH_TTL_MS / 1000),
  );
}

export async function readGooglePendingProfileCookie(): Promise<GooglePendingProfile | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GOOGLE_PENDING_COOKIE)?.value;
  if (!raw) return null;

  return decodeSigned<GooglePendingProfile>(
    raw,
    (value) =>
      Boolean(value.sub) &&
      Boolean(value.email) &&
      typeof value.expiresAt === 'number' &&
      value.expiresAt > Date.now(),
  );
}

export async function clearGooglePendingProfileCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GOOGLE_PENDING_COOKIE);
}
