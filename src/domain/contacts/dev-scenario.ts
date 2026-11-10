import { z } from 'zod';

/** Dev-only list previews (`?scenario=` on `/contacts`). */
export const contactsDevScenarioSchema = z.enum([
  'empty',
  'display-fallbacks',
  'list-populated',
]);

export type ContactsDevScenario = z.infer<typeof contactsDevScenarioSchema>;

export function contactsDevFixturesEnabled(): boolean {
  if (process.env.PLAYWRIGHT_E2E === '1') {
    return false;
  }
  const env = process.env.APP_ENV?.trim() || process.env.NODE_ENV;
  return env === 'local' || env === 'development';
}

export function parseContactsDevScenario(
  searchParams: URLSearchParams,
): ContactsDevScenario | undefined {
  if (!contactsDevFixturesEnabled()) {
    return undefined;
  }
  const raw = searchParams.get('scenario');
  if (!raw) return undefined;
  const parsed = contactsDevScenarioSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}
