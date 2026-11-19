'use server';

import { pipelineIdSchema } from '@/domain/pipeline/schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { ForbiddenError, NotFoundError } from '@/server/access/capabilities';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { archivePipeline } from '@/server/services/pipeline/archive-pipeline';

export async function archivePipelineAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = pipelineIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Check the selected pipeline.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      archivePipeline(tx, session, parsed.data),
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
