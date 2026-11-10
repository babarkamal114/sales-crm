import 'server-only';

import { and, eq } from 'drizzle-orm';
import { parseMentions } from '@/domain/conversations/parse-mentions';
import type { AddConversationCommentInput } from '@/domain/conversations/send-message-schema';
import { writeAudit } from '@/server/audit/write';
import { commentMention, conversation, conversationComment } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireConversationView } from '@/server/services/conversations/conversation-access';

export type AddCommentResult = {
  commentId: string;
  conversationId: string;
  contactId: string;
  mentionUserIds: string[];
};

export async function addConversationComment(
  tx: DbTransaction,
  session: TenantSession,
  input: AddConversationCommentInput,
): Promise<AddCommentResult> {
  const conv = await requireConversationView(tx, session, input.conversationId);

  const existing = await tx
    .select({ id: conversationComment.id })
    .from(conversationComment)
    .where(
      and(eq(conversationComment.orgId, session.orgId), eq(conversationComment.id, input.clientId)),
    )
    .limit(1);

  if (existing[0]) {
    return {
      commentId: existing[0].id,
      conversationId: conv.id,
      contactId: conv.contactId,
      mentionUserIds: [],
    };
  }

  const [row] = await tx
    .insert(conversationComment)
    .values({
      id: input.clientId,
      orgId: session.orgId,
      conversationId: conv.id,
      authorId: session.userId,
      body: input.body,
    })
    .returning({ id: conversationComment.id });

  if (!row) throw new Error('Comment insert failed');

  const now = new Date();
  await tx
    .update(conversation)
    .set({
      lastMessageAt: now,
      updatedAt: now,
      updatedBy: session.userId,
      version: conv.version + 1,
    })
    .where(and(eq(conversation.orgId, session.orgId), eq(conversation.id, conv.id)));

  const mentionUserIds = parseMentions(input.body, []);
  if (mentionUserIds.length > 0) {
    await tx.insert(commentMention).values(
      mentionUserIds.map((userId) => ({
        commentId: row.id,
        userId,
        orgId: session.orgId,
      })),
    );
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'conversation.comment_added',
    entityType: 'conversation_comment',
    entityId: row.id,
    metadata: { conversationId: conv.id },
  });

  return {
    commentId: row.id,
    conversationId: conv.id,
    contactId: conv.contactId,
    mentionUserIds,
  };
}
