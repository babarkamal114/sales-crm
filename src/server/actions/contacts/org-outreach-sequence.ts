'use server';

import {
  createOrgOutreachSequenceSchema,
  deleteOrgOutreachSequenceSchema,
  upsertOrgOutreachSequenceSchema,
} from '@/domain/contacts/outreach-sequence-schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { handleContactActionError } from '@/server/actions/contacts/handle-contact-action-error';
import {
  createOrgOutreachSequence,
  deleteOrgOutreachSequence,
  listOrgOutreachSequences,
  upsertOrgOutreachSequence,
} from '@/server/services/contacts/org-outreach-sequence';

export async function listOrgOutreachSequencesAction() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  try {
    const items = await withTenant(session, (tx) => listOrgOutreachSequences(tx, session));
    return actionSuccess({ items });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function createOrgOutreachSequenceAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = createOrgOutreachSequenceSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Enter a sequence name.');
  }

  try {
    const sequence = await withTenant(session, (tx) =>
      createOrgOutreachSequence(tx, session, parsed.data),
    );
    return actionSuccess({ sequence });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function deleteOrgOutreachSequenceAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = deleteOrgOutreachSequenceSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Invalid sequence.');
  }

  try {
    await withTenant(session, (tx) =>
      deleteOrgOutreachSequence(tx, session, parsed.data.sequenceKey),
    );
    return actionSuccess({ deleted: true });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    if (error instanceof Error && error.message.includes('cannot be deleted')) {
      return actionFailure('VALIDATION_FAILED', error.message);
    }
    throw error;
  }
}

export async function upsertOrgOutreachSequenceAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = upsertOrgOutreachSequenceSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the sequence.');
  }

  try {
    const sequence = await withTenant(session, (tx) =>
      upsertOrgOutreachSequence(tx, session, parsed.data),
    );
    return actionSuccess({ sequence });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}
