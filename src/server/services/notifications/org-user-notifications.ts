import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import { orgUserNotification, contactFollower } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export type OrgUserNotificationView = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  contactId: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function listOrgUserNotifications(
  tx: DbTransaction,
  session: TenantSession,
  limit = 30,
): Promise<OrgUserNotificationView[]> {
  const rows = await tx
    .select()
    .from(orgUserNotification)
    .where(
      and(
        eq(orgUserNotification.orgId, session.orgId),
        eq(orgUserNotification.userId, session.userId),
      ),
    )
    .orderBy(desc(orgUserNotification.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    contactId: row.contactId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function markOrgUserNotificationRead(
  tx: DbTransaction,
  session: TenantSession,
  notificationId: string,
): Promise<void> {
  await tx
    .update(orgUserNotification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(orgUserNotification.id, notificationId),
        eq(orgUserNotification.orgId, session.orgId),
        eq(orgUserNotification.userId, session.userId),
        isNull(orgUserNotification.readAt),
      ),
    );
}

export async function notifyContactEmailReply(
  tx: DbTransaction,
  session: TenantSession,
  input: {
    contactId: string;
    contactName: string;
    ownerId: string | null;
    preview: string;
  },
): Promise<void> {
  const recipientIds = new Set<string>();
  if (input.ownerId) recipientIds.add(input.ownerId);
  recipientIds.add(session.userId);

  const followers = await tx
    .select({ userId: contactFollower.userId })
    .from(contactFollower)
    .where(
      and(
        eq(contactFollower.orgId, session.orgId),
        eq(contactFollower.contactId, input.contactId),
      ),
    );

  for (const follower of followers) {
    recipientIds.add(follower.userId);
  }

  const href = `/contacts/${input.contactId}/email`;
  const title = `${input.contactName} replied to outreach`;
  const body =
    input.preview.length > 0
      ? input.preview.slice(0, 240)
      : 'Review the AI draft reply on the contact email page.';

  const now = new Date();
  for (const userId of recipientIds) {
    await tx.insert(orgUserNotification).values({
      orgId: session.orgId,
      userId,
      kind: 'contact_email_reply',
      title,
      body,
      href,
      contactId: input.contactId,
      createdAt: now,
    });
  }
}
