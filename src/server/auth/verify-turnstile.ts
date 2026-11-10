import 'server-only';

import type { TurnstileAuthAction } from '@/lib/auth/turnstile-public';
import { getEnv } from '@/server/env';

export type { TurnstileAuthAction };

interface TurnstileSiteverifyResponse {
  success?: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
}

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Whether Turnstile is required. Reads only Turnstile-related env vars so auth
 * pages can render before DATABASE_URL / SESSION_SECRET are configured.
 */
export function isTurnstileEnabled(): boolean {
  if (process.env.PLAYWRIGHT_E2E === '1') {
    return false;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const hostnames = process.env.TURNSTILE_HOSTNAMES?.trim();

  return Boolean(secret && siteKey && hostnames);
}

function getAllowedHostnames(): Set<string> {
  const raw = process.env.TURNSTILE_HOSTNAMES?.trim() ?? '';

  return new Set(
    raw
      .split(',')
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function verifyTurnstileToken(input: {
  token: string;
  expectedAction: TurnstileAuthAction;
  remoteIp?: string;
}): Promise<boolean> {
  if (!isTurnstileEnabled()) {
    return true;
  }

  // Validated env when actually verifying (sign-in / sign-up actions).
  const secret = getEnv().TURNSTILE_SECRET_KEY ?? process.env.TURNSTILE_SECRET_KEY;
  const allowedHostnames = getAllowedHostnames();
  const token = input.token.trim();

  if (
    !secret ||
    allowedHostnames.size === 0 ||
    token.length === 0 ||
    token.length > 2048
  ) {
    return false;
  }

  let result: TurnstileSiteverifyResponse;

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret,
        response: token,
        ...(input.remoteIp ? { remoteip: input.remoteIp } : {}),
      }),
    });

    if (!response.ok) {
      return false;
    }

    result = (await response.json()) as TurnstileSiteverifyResponse;
  } catch {
    return false;
  }

  if (result.success !== true) {
    return false;
  }

  if (result.action !== input.expectedAction) {
    return false;
  }

  const hostname = result.hostname?.trim().toLowerCase();

  if (!hostname || !allowedHostnames.has(hostname)) {
    return false;
  }

  return true;
}
