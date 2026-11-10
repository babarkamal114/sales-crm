import 'server-only';

import type { CrmSession } from '@/server/auth/session-types';
import { loadEntryContext } from '@/server/onboarding/load-entry-context';
import { resolveEntry } from '@/domain/onboarding/resolve-entry';

export async function resolvePostAuthRedirect(
  session: CrmSession,
): Promise<string> {
  const context = await loadEntryContext(session);
  return resolveEntry(context).redirectTo;
}
