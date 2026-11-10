'use server';

import { z } from 'zod';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { handleContactActionError } from '@/server/actions/contacts/handle-contact-action-error';
import {
  dismissContactEmailReplyDraft,
  getPendingContactEmailReplyDraft,
  syncContactEmailReplies,
} from '@/server/services/contacts/contact-email-reply-sync';

const contactIdSchema = z.object({
  contactId: z.string().uuid(),
});

const dismissSchema = z.object({
  contactId: z.string().uuid(),
  draftId: z.string().uuid(),
});

const syncSchema = z.object({
  contactId: z.string().uuid(),
  orgName: z.string().trim().min(1).max(200),
  senderName: z.string().trim().min(1).max(200),
});

export async function getContactEmailReplyDraftAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = contactIdSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Invalid contact.');
  }

  try {
    const draft = await withTenant(session, (tx) =>
      getPendingContactEmailReplyDraft(tx, session, parsed.data.contactId),
    );
    return actionSuccess({ draft });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function syncContactEmailRepliesAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = syncSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Invalid request.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      syncContactEmailReplies(tx, session, parsed.data.contactId, {
        orgName: parsed.data.orgName,
        senderName: parsed.data.senderName,
      }),
    );
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function dismissContactEmailReplyDraftAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = dismissSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Invalid draft.');
  }

  try {
    await withTenant(session, (tx) =>
      dismissContactEmailReplyDraft(tx, session, parsed.data),
    );
    return actionSuccess({ dismissed: true });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}
