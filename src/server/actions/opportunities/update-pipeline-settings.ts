'use server';

import { updatePipelineSettingsSchema } from '@/domain/pipeline/schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { ForbiddenError, NotFoundError } from '@/server/access/capabilities';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import {
  PipelineSettingsValidationError,
  PipelineSlugTakenError,
  updatePipelineSettings,
} from '@/server/services/pipeline/update-pipeline-settings';

export async function updatePipelineSettingsAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = updatePipelineSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.', first?.path[0] as string | undefined);
  }

  try {
    const result = await withTenant(session, (tx) =>
      updatePipelineSettings(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return actionFailure('NOT_FOUND', error.message);
    }
    if (error instanceof ForbiddenError) {
      return actionFailure('FORBIDDEN', error.message);
    }
    if (error instanceof PipelineSlugTakenError) {
      return actionFailure('VALIDATION_FAILED', error.message, 'slug');
    }
    if (error instanceof PipelineSettingsValidationError) {
      return actionFailure('VALIDATION_FAILED', error.message);
    }
    if (error instanceof Error && (error as Error & { code?: string }).code === 'CONFLICT') {
      return actionFailure('CONFLICT', error.message);
    }
    throw error;
  }
}
