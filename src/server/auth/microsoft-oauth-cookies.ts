import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getEnv } from '@/server/env';
import {
  MICROSOFT_OAUTH_STATE_COOKIE,
  MICROSOFT_OAUTH_TTL_MS,
  MICROSOFT_PENDING_COOKIE,
  type MicrosoftOAuthMode,
  type MicrosoftOAuthState,
  type MicrosoftPendingProfile,
} from '@/lib/auth/microsoft-oauth';

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

export async function setMicrosoftOAuthStateCookie(
  mode: MicrosoftOAuthMode,
): Promise<string> {
  const state = randomBytes(32).toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set(
    MICROSOFT_OAUTH_STATE_COOKIE,
    encodeSigned({
      state,
      mode,
      expiresAt: Date.now() + MICROSOFT_OAUTH_TTL_MS,
    } satisfies MicrosoftOAuthState),
    cookieOptions(MICROSOFT_OAUTH_TTL_MS / 1000),
  );
  return state;
}

export async function readMicrosoftOAuthStateCookie(): Promise<MicrosoftOAuthState | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(MICROSOFT_OAUTH_STATE_COOKIE)?.value;
  if (!raw) return null;

  return decodeSigned<MicrosoftOAuthState>(
    raw,
    (value) =>
      typeof value.state === 'string' &&
      (value.mode === 'sign-in' || value.mode === 'sign-up') &&
      typeof value.expiresAt === 'number' &&
      value.expiresAt > Date.now(),
  );
}

export async function clearMicrosoftOAuthStateCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(MICROSOFT_OAUTH_STATE_COOKIE);
}

export async function setMicrosoftPendingProfileCookie(
  profile: Omit<MicrosoftPendingProfile, 'expiresAt'>,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    MICROSOFT_PENDING_COOKIE,
    encodeSigned({
      ...profile,
      expiresAt: Date.now() + MICROSOFT_OAUTH_TTL_MS,
    } satisfies MicrosoftPendingProfile),
    cookieOptions(MICROSOFT_OAUTH_TTL_MS / 1000),
  );
}

export async function readMicrosoftPendingProfileCookie(): Promise<MicrosoftPendingProfile | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(MICROSOFT_PENDING_COOKIE)?.value;
  if (!raw) return null;

  return decodeSigned<MicrosoftPendingProfile>(
    raw,
    (value) =>
      Boolean(value.sub) &&
      Boolean(value.email) &&
      typeof value.expiresAt === 'number' &&
      value.expiresAt > Date.now(),
  );
}

export async function clearMicrosoftPendingProfileCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(MICROSOFT_PENDING_COOKIE);
}
