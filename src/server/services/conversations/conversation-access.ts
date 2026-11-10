import 'server-only';

import { and, eq } from 'drizzle-orm';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { conversation } from '@/server/db/schema';
import type { Conversation } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireContactView } from '@/server/services/contacts/contact-access';

export async function requireConversationView(
  tx: DbTransaction,
  session: TenantSession,
  conversationId: string,
): Promise<Conversation> {
  assertCan(session, 'contact.view');

  const [row] = await tx
    .select()
    .from(conversation)
    .where(and(eq(conversation.orgId, session.orgId), eq(conversation.id, conversationId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Conversation not found.');
  }

  await requireContactView(tx, session, row.contactId);
  return row;
}
