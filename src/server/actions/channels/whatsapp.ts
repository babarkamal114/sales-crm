'use server';

import { z } from 'zod';
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { connectByoMetaWhatsApp } from '@/server/services/channels/connect-byo';
import type { WhatsAppChannelDetail } from '@/domain/channels/whatsapp-detail';
import {
  completeManagedWhatsAppSimulator,
  getWhatsAppChannelDetail,
  submitWhatsAppTemplateDraft,
  syncWhatsAppTemplatesFromProvider,
} from '@/server/services/channels/managed-whatsapp';

const simulatorSchema = z.object({
  displayName: z.string().trim().max(120).optional(),
});

const byoSchema = z.object({
  wabaId: z.string().trim().min(1),
  phoneNumberId: z.string().trim().min(1),
  accessToken: z.string().trim().min(1),
  appSecret: z.string().trim().min(1),
});

const templateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(1024),
  language: z.string().trim().optional(),
});

export async function getWhatsAppChannelDetailAction(): Promise<
  ActionResult<WhatsAppChannelDetail>
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const detail = await withTenant(session, (tx) => getWhatsAppChannelDetail(tx, session));
  return actionSuccess(detail);
}

export async function completeManagedWhatsAppSimulatorAction(
  input: unknown,
): Promise<ActionResult<{ connectionId: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = simulatorSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION', 'Invalid input.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      completeManagedWhatsAppSimulator(tx, session, {
        ...(parsed.data.displayName !== undefined
          ? { displayName: parsed.data.displayName }
          : {}),
      }),
    );
    return actionSuccess(result);
  } catch (e) {
    return actionFailure('FORBIDDEN', e instanceof Error ? e.message : 'Could not connect.');
  }
}

export async function connectByoMetaWhatsAppAction(
  input: unknown,
): Promise<ActionResult<{ connectionId: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = byoSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION', 'Fill in all BYO fields.');
  }

  const result = await withTenant(session, (tx) =>
    connectByoMetaWhatsApp(tx, session, parsed.data),
  );

  if (result.status === 'failed') {
    return actionFailure('PROVIDER', result.error ?? 'Connection failed.');
  }

  return actionSuccess({ connectionId: result.connectionId });
}

export async function submitWhatsAppTemplateDraftAction(
  input: unknown,
): Promise<ActionResult<{ templateId: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION', 'Template name and body are required.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      submitWhatsAppTemplateDraft(tx, session, {
        name: parsed.data.name,
        body: parsed.data.body,
        ...(parsed.data.language !== undefined ? { language: parsed.data.language } : {}),
      }),
    );
    return actionSuccess(result);
  } catch (e) {
    return actionFailure('FORBIDDEN', e instanceof Error ? e.message : 'Could not save template.');
  }
}

export async function syncWhatsAppTemplatesAction(): Promise<ActionResult<{ updated: number }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      syncWhatsAppTemplatesFromProvider(tx, session),
    );
    return actionSuccess(result);
  } catch (e) {
    return actionFailure('FORBIDDEN', e instanceof Error ? e.message : 'Sync failed.');
  }
}
