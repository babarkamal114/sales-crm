'use server';

import { createOrMatchContactSchema } from '@/domain/contacts/mutation-schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { ForbiddenError } from '@/server/access/capabilities';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { createOrMatchContact } from '@/server/services/contacts/create-or-match-contact';

export async function createOrMatchContactAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = createOrMatchContactSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      createOrMatchContact(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return actionFailure('FORBIDDEN', error.message);
    }
    throw error;
  }
}
