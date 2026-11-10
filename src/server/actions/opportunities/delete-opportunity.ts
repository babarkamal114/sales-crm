'use server';

import { z } from 'zod';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { ForbiddenError, NotFoundError } from '@/server/access/capabilities';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { deleteOpportunity } from '@/server/services/opportunities/delete-opportunity';

const deleteOpportunitySchema = z.object({
  opportunityId: z.string().uuid(),
});

export async function deleteOpportunityAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = deleteOpportunitySchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Invalid request.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      deleteOpportunity(tx, session, parsed.data.opportunityId),
    );
    return actionSuccess(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return actionFailure('NOT_FOUND', error.message);
    }
    if (error instanceof ForbiddenError) {
      return actionFailure('FORBIDDEN', error.message);
    }
    throw error;
  }
}
