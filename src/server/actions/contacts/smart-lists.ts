'use server';

import {
  deleteSmartListSchema,
  reorderSmartListsSchema,
  smartListMutationSchema,
  updateSmartListSchema,
} from '@/domain/contacts/mutation-schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { handleContactActionError } from '@/server/actions/contacts/handle-contact-action-error';
import {
  createSmartList,
  deleteSmartList,
  listSmartLists,
  reorderSmartLists,
  updateSmartList,
} from '@/server/services/contacts/smart-lists';

export async function listSmartListsAction() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  try {
    const result = await withTenant(session, (tx) => listSmartLists(tx, session));
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function saveSmartListAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = smartListMutationSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) => createSmartList(tx, session, parsed.data));
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

/** @deprecated use saveSmartListAction */
export const createSmartListAction = saveSmartListAction;

export async function updateSmartListAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = updateSmartListSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) => updateSmartList(tx, session, parsed.data));
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function deleteSmartListAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = deleteSmartListSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) => deleteSmartList(tx, session, parsed.data));
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function reorderSmartListsAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = reorderSmartListsSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      reorderSmartLists(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}
