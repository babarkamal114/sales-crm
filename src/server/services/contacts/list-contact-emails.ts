import 'server-only';

import { and, desc, eq } from 'drizzle-orm';
import type { ContactEmailSendView } from '@/domain/contacts/email-template-view';
import { assertCan } from '@/server/access/capabilities';
import { contactEmailSend, user } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireContactView } from '@/server/services/contacts/contact-access';

export async function listContactEmails(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
  limit = 30,
): Promise<ContactEmailSendView[]> {
  assertCan(session, 'contact.view');
  await requireContactView(tx, session, contactId);

  const rows = await tx
    .select({
      id: contactEmailSend.id,
      subject: contactEmailSend.subject,
      toAddress: contactEmailSend.toAddress,
      status: contactEmailSend.status,
      errorMessage: contactEmailSend.errorMessage,
      stepKey: contactEmailSend.stepKey,
      createdAt: contactEmailSend.createdAt,
      senderName: user.fullName,
    })
    .from(contactEmailSend)
    .innerJoin(user, eq(contactEmailSend.createdBy, user.id))
    .where(
      and(eq(contactEmailSend.orgId, session.orgId), eq(contactEmailSend.contactId, contactId)),
    )
    .orderBy(desc(contactEmailSend.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    toAddress: row.toAddress,
    status: row.status as ContactEmailSendView['status'],
    errorMessage: row.errorMessage,
    stepKey: row.stepKey,
    createdAt: row.createdAt.toISOString(),
    senderName: row.senderName?.trim() || 'User',
  }));
}
