'use server';

import {
  addConversationCommentSchema,
  sendMessageSchema,
} from '@/domain/conversations/send-message-schema';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import type { EntityRef } from '@/lib/entities/types';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { broadcastAffectedAfterAction } from '@/lib/entities/publish-affected-server';
import { NotFoundError, ForbiddenError } from '@/server/access/capabilities';
import {
  SendBlockedError,
  sendMessage,
} from '@/server/services/conversations/send-message';
import { addConversationComment } from '@/server/services/conversations/add-comment';
import { dispatchOutboxEventIds } from '@/server/outbox/dispatch';

function affectedForConversation(contactId: string): EntityRef[] {
  return [{ type: 'contact', id: contactId }];
}

export async function sendMessageAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the message.');
  }

  try {
    const result = await withTenant(session, (tx) => sendMessage(tx, session, parsed.data));
    const affected = affectedForConversation(result.contactId);

    if (result.outboxEventId) {
      await dispatchOutboxEventIds(session.orgId, [result.outboxEventId]);
    }

    broadcastAffectedAfterAction({
      orgId: session.orgId,
      actorId: session.userId,
      affected,
    });

    return actionSuccess(
      {
        messageId: result.messageId,
        conversationId: result.conversationId,
        status: result.status,
        preview: result.preview,
      },
      affected,
    );
  } catch (error) {
    if (error instanceof SendBlockedError) {
      return actionFailure('SEND_BLOCKED', error.reason);
    }
    if (error instanceof NotFoundError) {
      return actionFailure('NOT_FOUND', error.message);
    }
    if (error instanceof ForbiddenError) {
      return actionFailure('FORBIDDEN', error.message);
    }
    throw error;
  }
}

export async function addConversationCommentAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = addConversationCommentSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the comment.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      addConversationComment(tx, session, parsed.data),
    );
    const affected = affectedForConversation(result.contactId);
    broadcastAffectedAfterAction({
      orgId: session.orgId,
      actorId: session.userId,
      affected,
    });
    return actionSuccess({ commentId: result.commentId }, affected);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return actionFailure('NOT_FOUND', error.message);
    }
    if (error instanceof ForbiddenError) {
      return actionFailure('FORBIDDEN', error.message);
    }
    throw error;
  }
}
