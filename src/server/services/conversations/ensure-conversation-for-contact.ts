import 'server-only';

import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { writeAudit } from '@/server/audit/write';
import { contact, conversation } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireContactView } from '@/server/services/contacts/contact-access';

export type EnsureConversationResult = {
  conversationId: string;
  contactId: string;
  created: boolean;
};

/** One conversation per contact per org (creates if missing). */
export async function ensureConversationForContact(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
): Promise<EnsureConversationResult> {
  await requireContactView(tx, session, contactId);

  const [existing] = await tx
    .select({ id: conversation.id })
    .from(conversation)
    .where(and(eq(conversation.orgId, session.orgId), eq(conversation.contactId, contactId)))
    .limit(1);

  if (existing) {
    return { conversationId: existing.id, contactId, created: false };
  }

  const [contactRow] = await tx
    .select({ ownerId: contact.ownerId })
    .from(contact)
    .where(and(eq(contact.orgId, session.orgId), eq(contact.id, contactId)))
    .limit(1);

  const replyToken = randomBytes(16).toString('hex');

  const [created] = await tx
    .insert(conversation)
    .values({
      orgId: session.orgId,
      contactId,
      status: 'open',
      assigneeId: contactRow?.ownerId ?? session.userId,
      replyToken,
      createdBy: session.userId,
      updatedBy: session.userId,
    })
    .returning({ id: conversation.id });

  if (!created) throw new Error('Conversation insert failed');

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'conversation.created',
    entityType: 'conversation',
    entityId: created.id,
    metadata: { contactId },
  });

  return { conversationId: created.id, contactId, created: true };
}
