'use server';

import { z } from 'zod';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { handleContactActionError } from '@/server/actions/contacts/handle-contact-action-error';
import {
  pauseContactEmailSequence,
  scheduleContactEmailSequence,
  skipContactEmailSequenceStep,
  switchContactEmailSequence,
} from '@/server/services/contacts/contact-email-sequence';

const contactIdSchema = z.object({
  contactId: z.string().uuid(),
});

const scheduleSchema = z.object({
  contactId: z.string().uuid(),
  scheduledStartAt: z.string().trim().min(1),
});

const switchSchema = z.object({
  contactId: z.string().uuid(),
  sequenceKey: z.string().trim().min(1).max(80),
});

export async function skipContactEmailSequenceStepAction(input: unknown) {
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
    const sequence = await withTenant(session, (tx) =>
      skipContactEmailSequenceStep(tx, session, parsed.data.contactId),
    );
    return actionSuccess({ sequence });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function switchContactEmailSequenceAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = switchSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Invalid sequence.');
  }

  try {
    const sequence = await withTenant(session, (tx) =>
      switchContactEmailSequence(
        tx,
        session,
        parsed.data.contactId,
        parsed.data.sequenceKey,
      ),
    );
    return actionSuccess({ sequence });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function scheduleContactEmailSequenceAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Invalid schedule.');
  }

  try {
    const sequence = await withTenant(session, (tx) =>
      scheduleContactEmailSequence(
        tx,
        session,
        parsed.data.contactId,
        parsed.data.scheduledStartAt,
      ),
    );
    return actionSuccess({ sequence });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function pauseContactEmailSequenceAction(input: unknown) {
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
    const sequence = await withTenant(session, (tx) =>
      pauseContactEmailSequence(tx, session, parsed.data.contactId),
    );
    return actionSuccess({ sequence });
  } catch (error) {
    const mapped = handleContactActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}
