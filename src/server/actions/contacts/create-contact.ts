'use server';

import { createContactSchema } from '@/domain/contacts/schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { affectedFromContactCreate } from '@/lib/entities/affected';
import { broadcastAffectedAfterAction } from '@/lib/entities/publish-affected-server';
import { ForbiddenError } from '@/server/access/capabilities';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import {
  createContact,
  DuplicateContactError,
} from '@/server/services/contacts/create-contact';

export async function createContactAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = createContactSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) => createContact(tx, session, parsed.data));
    const affected = affectedFromContactCreate(result);
    broadcastAffectedAfterAction({
      orgId: session.orgId,
      actorId: session.userId,
      affected,
    });
    return actionSuccess(result, affected);
  } catch (error) {
    if (error instanceof DuplicateContactError) {
      return {
        ...actionFailure('CONFLICT', error.message),
        data: { contactId: error.matchingContactId },
      };
    }
    if (error instanceof ForbiddenError) {
      return actionFailure('FORBIDDEN', error.message);
    }
    throw error;
  }
}
