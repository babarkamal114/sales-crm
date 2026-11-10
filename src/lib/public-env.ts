import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.string().url().optional(),
  ),
  NEXT_PUBLIC_COMPLIANCE_APP_URL: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.string().url().optional(),
  ),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cached: Readonly<PublicEnv> | null = null;

export function getPublicEnv(): Readonly<PublicEnv> {
  if (cached) {
    return cached;
  }

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_COMPLIANCE_APP_URL: process.env.NEXT_PUBLIC_COMPLIANCE_APP_URL,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid public environment: ${details}`);
  }

  cached = Object.freeze(parsed.data);
  return cached;
}

export function getComplianceAppUrl(): string {
  return (
    getPublicEnv().NEXT_PUBLIC_COMPLIANCE_APP_URL ??
    'https://app.sponsoro.co.uk'
  );
}

export function getCrmAppUrl(): string {
  return (
    getPublicEnv().NEXT_PUBLIC_APP_URL ?? 'https://crm.sponsoro.co.uk'
  );
}
