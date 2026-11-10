import 'server-only';

import { z } from 'zod';

function emptyToUndefined(value: unknown): unknown {
  if (value === '' || value === undefined) {
    return undefined;
  }
  return value;
}

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z
    .preprocess(
      emptyToUndefined,
      z.enum(['local', 'preview', 'staging', 'production']).optional(),
    )
    .transform((value) => value ?? 'local'),
  APP_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
  DATABASE_URL: z.string().url(),
  DATABASE_MIGRATION_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
  DATABASE_POOL_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(50).optional(),
  ),
  SESSION_SECRET: z.string().min(32),
  ALLOW_INSECURE_SESSION_COOKIES: z.preprocess(
    (value) => value === 'true' || value === true,
    z.boolean().optional(),
  ),
  COMPLIANCE_APP_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
  TURNSTILE_SECRET_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  TURNSTILE_HOSTNAMES: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  MICROSOFT_SSO_CLIENT_ID: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  MICROSOFT_SSO_CLIENT_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  MICROSOFT_SSO_TENANT_ID: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
}).superRefine((data, ctx) => {
  const turnstileValues = [
    data.TURNSTILE_SECRET_KEY,
    data.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    data.TURNSTILE_HOSTNAMES,
  ];
  const setCount = turnstileValues.filter(Boolean).length;
  if (setCount > 0 && setCount < 3) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Turnstile: set TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY, and TURNSTILE_HOSTNAMES together, or leave all unset.',
      path: ['NEXT_PUBLIC_TURNSTILE_SITE_KEY'],
    });
  }

  const googleValues = [data.GOOGLE_CLIENT_ID, data.GOOGLE_CLIENT_SECRET];
  const googleConfiguredCount = googleValues.filter(Boolean).length;
  if (googleConfiguredCount === 1) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Google sign-in: set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or leave both unset.',
      path: ['GOOGLE_CLIENT_ID'],
    });
  }

  const microsoftValues = [
    data.MICROSOFT_SSO_CLIENT_ID,
    data.MICROSOFT_SSO_CLIENT_SECRET,
    data.MICROSOFT_SSO_TENANT_ID,
  ];
  const microsoftConfiguredCount = microsoftValues.filter(Boolean).length;
  if (microsoftConfiguredCount > 0 && microsoftConfiguredCount < 3) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Microsoft sign-in: set MICROSOFT_SSO_CLIENT_ID, MICROSOFT_SSO_CLIENT_SECRET, and MICROSOFT_SSO_TENANT_ID together, or leave all unset.',
      path: ['MICROSOFT_SSO_CLIENT_ID'],
    });
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: Readonly<ServerEnv> | null = null;

export function getEnv(): Readonly<ServerEnv> {
  if (cached) {
    return cached;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const isProductionBuild =
      process.env.NEXT_PHASE === 'phase-production-build';

    if (isProductionBuild) {
      cached = Object.freeze({
        NODE_ENV: 'production' as const,
        APP_ENV: 'local' as const,
        APP_BASE_URL: 'http://localhost:3000',
        DATABASE_URL: 'postgresql://build:build@127.0.0.1:5432/build',
        DATABASE_MIGRATION_URL: undefined,
        DATABASE_POOL_MAX: undefined,
        SESSION_SECRET: 'build-time-placeholder-session-secret-32',
        ALLOW_INSECURE_SESSION_COOKIES: true,
        COMPLIANCE_APP_URL: 'https://app.sponsoro.co.uk',
        TURNSTILE_SECRET_KEY: undefined,
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined,
        TURNSTILE_HOSTNAMES: undefined,
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
        MICROSOFT_SSO_CLIENT_ID: undefined,
        MICROSOFT_SSO_CLIENT_SECRET: undefined,
        MICROSOFT_SSO_TENANT_ID: undefined,
      });
      return cached;
    }

    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }

  cached = Object.freeze(parsed.data);
  return cached;
}

export const env = new Proxy({} as Readonly<ServerEnv>, {
  get(_target, prop) {
    return Reflect.get(getEnv(), prop as keyof ServerEnv);
  },
});

export function getAppUrl(): string {
  const appEnv = getEnv();
  if (appEnv.APP_BASE_URL) {
    return appEnv.APP_BASE_URL.replace(/\/$/, '');
  }
  if (appEnv.NODE_ENV === 'development' || appEnv.NODE_ENV === 'test') {
    return 'http://localhost:3000';
  }
  return 'http://localhost:3000';
}

export type GoogleAuthEnv = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
};

export function isGoogleAuthConfigured(): boolean {
  const appEnv = getEnv();
  return Boolean(appEnv.GOOGLE_CLIENT_ID && appEnv.GOOGLE_CLIENT_SECRET);
}

export function getGoogleAuthEnv(): GoogleAuthEnv {
  const appEnv = getEnv();
  if (!appEnv.GOOGLE_CLIENT_ID || !appEnv.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google sign-in is not configured.');
  }
  return {
    GOOGLE_CLIENT_ID: appEnv.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: appEnv.GOOGLE_CLIENT_SECRET,
  };
}

export function getGoogleOAuthRedirectUri(): string {
  return `${getAppUrl()}/api/auth/google/callback`;
}

export type MicrosoftSsoEnv = {
  MICROSOFT_SSO_CLIENT_ID: string;
  MICROSOFT_SSO_CLIENT_SECRET: string;
  MICROSOFT_SSO_TENANT_ID: string;
};

export function isMicrosoftSsoConfigured(): boolean {
  const appEnv = getEnv();
  return Boolean(
    appEnv.MICROSOFT_SSO_CLIENT_ID &&
      appEnv.MICROSOFT_SSO_CLIENT_SECRET &&
      appEnv.MICROSOFT_SSO_TENANT_ID,
  );
}

export function getMicrosoftSsoEnv(): MicrosoftSsoEnv {
  const appEnv = getEnv();
  if (
    !appEnv.MICROSOFT_SSO_CLIENT_ID ||
    !appEnv.MICROSOFT_SSO_CLIENT_SECRET ||
    !appEnv.MICROSOFT_SSO_TENANT_ID
  ) {
    throw new Error('Microsoft sign-in is not configured.');
  }
  return {
    MICROSOFT_SSO_CLIENT_ID: appEnv.MICROSOFT_SSO_CLIENT_ID,
    MICROSOFT_SSO_CLIENT_SECRET: appEnv.MICROSOFT_SSO_CLIENT_SECRET,
    MICROSOFT_SSO_TENANT_ID: appEnv.MICROSOFT_SSO_TENANT_ID,
  };
}

export function getMicrosoftOAuthRedirectUri(): string {
  return `${getAppUrl()}/api/auth/microsoft/callback`;
}
