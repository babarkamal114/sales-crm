import 'server-only';

import { cache } from 'react';
import type { CrmSession } from '@/server/auth/session-types';
import { loadEntryContext } from '@/server/onboarding/load-entry-context';

/** Per-request cache — safe to call from layout + onboarding in one navigation. */
export const getEntryContext = cache((session: CrmSession) =>
  loadEntryContext(session),
);
