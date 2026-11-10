'use server';

import { z } from 'zod';
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import type { UsageOverview } from '@/domain/channels/usage-types';
import { getUsageOverview } from '@/server/services/channels/get-usage-overview';
import { updateOrgSpendLimit } from '@/server/services/channels/usage-billing';

const limitSchema = z.object({
  monthlyLimitPence: z.coerce.number().int().min(1000).max(10_000_000),
});

export async function getUsageOverviewAction(): Promise<ActionResult<UsageOverview>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const overview = await withTenant(session, (tx) => getUsageOverview(tx, session));
  return actionSuccess(overview);
}

export async function updateSpendLimitAction(
  input: unknown,
): Promise<ActionResult<{ ok: true }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only Admins can change spend limits.');
  }

  const parsed = limitSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION', 'Enter a valid monthly limit in pence (min £10).');
  }

  await withTenant(session, (tx) =>
    updateOrgSpendLimit(tx, session.orgId, {
      monthlyLimitPence: parsed.data.monthlyLimitPence,
    }),
  );

  return actionSuccess({ ok: true });
}
