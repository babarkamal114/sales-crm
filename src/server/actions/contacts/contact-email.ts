'use server';

import {
  deleteContactEmailTemplateSchema,
  sendContactEmailSchema,
  upsertContactEmailTemplateSchema,
} from '@/domain/contacts/email-schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { handleContactActionError } from '@/server/actions/contacts/handle-contact-action-error';
import {
  deleteContactEmailTemplate,
  upsertContactEmailTemplate,
} from '@/server/services/contacts/contact-email-templates';
import { sendContactEmails } from '@/server/services/contacts/send-contact-email';

export async function upsertContactEmailTemplateAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = upsertContactEmailTemplateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const template = await withTenant(session, (tx) =>
      upsertContactEmailTemplate(tx, session, parsed.data),
    );
    return actionSuccess({ template });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function deleteContactEmailTemplateAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = deleteContactEmailTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Invalid template.');
  }

  try {
    await withTenant(session, (tx) =>
      deleteContactEmailTemplate(tx, session, parsed.data.templateId),
    );
    return actionSuccess({ deleted: true });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function sendContactEmailAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = sendContactEmailSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the message.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      sendContactEmails(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}
