'use server';

import { createOpportunitySchema } from '@/domain/opportunities/schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { refsForOpportunityChange } from '@/lib/entities/affected';
import { broadcastAffectedAfterAction } from '@/lib/entities/publish-affected-server';
import { ForbiddenError, NotFoundError } from '@/server/access/capabilities';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { createOpportunity } from '@/server/services/opportunities/create-opportunity';

export async function createOpportunityAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = createOpportunitySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      createOpportunity(tx, session, parsed.data),
    );
    const affected = refsForOpportunityChange({
      opportunityId: result.id,
      contactId: result.contactId,
      companyId: result.companyId,
      pipelineId: result.pipelineId,
    });
    broadcastAffectedAfterAction({
      orgId: session.orgId,
      actorId: session.userId,
      affected,
    });
    return actionSuccess({ id: result.id }, affected);
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
