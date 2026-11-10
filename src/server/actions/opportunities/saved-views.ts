'use server';

import { createSavedViewSchema } from '@/domain/opportunities/saved-view';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { ForbiddenError, NotFoundError } from '@/server/access/capabilities';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import {
  createSavedView,
  deleteSavedView,
} from '@/server/services/opportunities/saved-views';

export async function createSavedViewAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = createSavedViewSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      createSavedView(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return actionFailure('FORBIDDEN', error.message);
    }
    throw error;
  }
}

export async function deleteSavedViewAction(savedViewId: string) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  try {
    await withTenant(session, (tx) => deleteSavedView(tx, session, savedViewId));
    return actionSuccess({ ok: true as const });
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
