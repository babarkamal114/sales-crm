'use server';

import { createTagSchema } from '@/domain/contacts/mutation-schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { handleContactActionError } from '@/server/actions/contacts/handle-contact-action-error';
import { createContactTag, listContactTags } from '@/server/services/contacts/contact-tags';

export async function listContactTagsAction() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  try {
    const items = await withTenant(session, (tx) => listContactTags(tx, session));
    return actionSuccess(items);
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function createContactTagAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) => createContactTag(tx, session, parsed.data));
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}
