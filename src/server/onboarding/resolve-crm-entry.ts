import 'server-only';

import type { CrmSession } from '@/server/auth/session-types';
import { getEntryContext } from '@/server/onboarding/get-entry-context';
import type { EntryResolution } from '@/domain/onboarding/entry-types';
import {
  redirectForIncompleteOnboarding,
  resolveEntry,
} from '@/domain/onboarding/resolve-entry';

export async function resolveCrmEntryForSession(
  session: CrmSession,
): Promise<EntryResolution> {
  const context = await getEntryContext(session);
  return resolveEntry(context);
}

/** Used by `(crm)/layout` — returns redirect target or null. */
export async function guardCrmRouteForSession(
  session: CrmSession,
  pathname: string,
): Promise<string | null> {
  const entry = await resolveCrmEntryForSession(session);
  return redirectForIncompleteOnboarding(entry, pathname);
}
