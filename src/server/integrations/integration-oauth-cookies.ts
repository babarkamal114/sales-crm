import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import {
  INTEGRATION_OAUTH_RETURN_COOKIE,
  INTEGRATION_OAUTH_TTL_MS,
  type IntegrationOAuthProviderId,
  type IntegrationOAuthState,
} from '@/lib/integrations/oauth-providers';
import { getEnv } from '@/server/env';

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

export async function setIntegrationOAuthStateCookie(input: {
  provider: IntegrationOAuthProviderId;
  orgId: string;
  userId: string;
  returnPath: string;
}): Promise<string> {
  const state = randomBytes(32).toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set(
    INTEGRATION_OAUTH_RETURN_COOKIE,
    encodeSigned({
      state,
      provider: input.provider,
      orgId: input.orgId,
      userId: input.userId,
      returnPath: input.returnPath,
      expiresAt: Date.now() + INTEGRATION_OAUTH_TTL_MS,
    } satisfies IntegrationOAuthState),
    cookieOptions(INTEGRATION_OAUTH_TTL_MS / 1000),
  );
  return state;
}

export async function readIntegrationOAuthStateCookie(): Promise<IntegrationOAuthState | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(INTEGRATION_OAUTH_RETURN_COOKIE)?.value;
  if (!raw) return null;

  return decodeSigned<IntegrationOAuthState>(
    raw,
    (value) =>
      typeof value.state === 'string' &&
      typeof value.orgId === 'string' &&
      typeof value.userId === 'string' &&
      typeof value.returnPath === 'string' &&
      typeof value.expiresAt === 'number' &&
      value.expiresAt > Date.now(),
  );
}

export async function clearIntegrationOAuthStateCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(INTEGRATION_OAUTH_RETURN_COOKIE);
}
