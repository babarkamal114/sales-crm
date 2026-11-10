'use server';

import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { createAccessRequest } from '@/server/services/access-request/create-access-request';

export async function createAccessRequestAction(): Promise<
  ActionResult<{ requestId: string; alreadyPending: boolean }>
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const result = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) =>
      createAccessRequest(tx, {
        orgId: session.orgId,
        userId: session.userId,
      }),
  );

  return actionSuccess({
    requestId: result.requestId,
    alreadyPending: !result.created,
  });
}
