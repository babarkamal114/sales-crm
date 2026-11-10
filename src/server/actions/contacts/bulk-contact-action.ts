'use server';

import { bulkContactActionSchema } from '@/domain/contacts/mutation-schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { handleContactActionError } from '@/server/actions/contacts/handle-contact-action-error';
import { runBulkContactAction } from '@/server/services/contacts/bulk-contact-actions';

export async function bulkContactAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = bulkContactActionSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      runBulkContactAction(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}
