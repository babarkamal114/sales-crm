import 'server-only';

import { randomUUID } from 'node:crypto';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { previewText } from '@/domain/conversations/preview-text';
import { contact, conversation, mailboxConnection, mailboxSyncState, message } from '@/server/db/schema';
import { withTenant } from '@/server/db/with-tenant';
import {
  extractEmailAddress,
  listGmailMessagesForContact,
  resolveGoogleMailboxAccessToken,
} from '@/server/integrations/google-mailbox-client';
import { enqueueOutbox } from '@/server/outbox/enqueue';

const CONTACTS_PER_RUN = 20;
const BACKFILL_DAYS = 90;

type Payload = { orgId: string; mailboxId: string; userId: string; offset?: number };

type ContactRow = { id: string; email: string };

export async function runMailboxContactBackfill(raw: unknown): Promise<{ outcome: string }> {
  const data = raw as Payload;
  if (!data?.orgId || !data.mailboxId || !data.userId) {
    return { outcome: 'invalid_payload' };
  }

  const offset = data.offset ?? 0;

  const loaded = await withTenant(
    { orgId: data.orgId, userId: data.userId, role: 'admin' },
    async (tx) => {
      const [mailbox] = await tx
        .select()
        .from(mailboxConnection)
        .where(
          and(
            eq(mailboxConnection.orgId, data.orgId),
            eq(mailboxConnection.id, data.mailboxId),
          ),
        )
        .limit(1);

      if (!mailbox || mailbox.provider !== 'google') {
        return { kind: 'skip' as const, reason: 'mailbox_not_google' };
      }

      const [sync] = await tx
        .select({ backfillFrom: mailboxSyncState.backfillFrom })
        .from(mailboxSyncState)
        .where(eq(mailboxSyncState.mailboxId, data.mailboxId))
        .limit(1);

      const afterMs =
        sync?.backfillFrom?.getTime() ??
        Date.now() - BACKFILL_DAYS * 24 * 60 * 60 * 1000;

      const accessToken = await resolveGoogleMailboxAccessToken(
        tx,
        data.mailboxId,
        data.userId,
        mailbox,
      );

      if (!accessToken) {
        await tx
          .update(mailboxConnection)
          .set({
            status: 'reconnect_required',
            statusReason: 'Mailbox token expired during backfill',
            updatedAt: new Date(),
            updatedBy: data.userId,
          })
          .where(eq(mailboxConnection.id, data.mailboxId));
        return { kind: 'skip' as const, reason: 'token_invalid' };
      }

      const contacts = await tx
        .select({ id: contact.id, email: contact.email })
        .from(contact)
        .where(
          and(eq(contact.orgId, data.orgId), isNotNull(contact.email), sql`${contact.email} <> ''`),
        )
        .orderBy(contact.id)
        .limit(CONTACTS_PER_RUN)
        .offset(offset);

      return {
        kind: 'ok' as const,
        accessToken,
        mailboxEmail: mailbox.emailAddress,
        afterMs,
        contacts: contacts.filter((c): c is ContactRow => Boolean(c.email?.trim())),
      };
    },
  );

  if (loaded.kind === 'skip') return { outcome: loaded.reason };

  let imported = 0;

  for (const row of loaded.contacts) {
    const contactEmail = row.email!.trim();
    const gmailMessages = await listGmailMessagesForContact(loaded.accessToken, {
      contactEmail,
      mailboxEmail: loaded.mailboxEmail,
      afterMs: loaded.afterMs,
      maxResults: 12,
    });

    if (gmailMessages.length === 0) continue;

    await withTenant(
      { orgId: data.orgId, userId: data.userId, role: 'admin' },
      async (tx) => {
        let [conv] = await tx
          .select({ id: conversation.id })
          .from(conversation)
          .where(
            and(eq(conversation.orgId, data.orgId), eq(conversation.contactId, row.id)),
          )
          .limit(1);

        if (!conv) {
          const [created] = await tx
            .insert(conversation)
            .values({
              orgId: data.orgId,
              contactId: row.id,
              status: 'open',
              assigneeId: data.userId,
              replyToken: randomUUID().replace(/-/g, ''),
              createdBy: data.userId,
              updatedBy: data.userId,
            })
            .returning({ id: conversation.id });
          conv = created!;
        }

        for (const gm of gmailMessages) {
          const [existing] = await tx
            .select({ id: message.id })
            .from(message)
            .where(
              and(
                eq(message.orgId, data.orgId),
                eq(message.provider, 'google_mail'),
                eq(message.providerMessageId, gm.id),
              ),
            )
            .limit(1);

          if (existing) continue;

          const fromEmail = extractEmailAddress(gm.from);
          const contactNorm = contactEmail.toLowerCase();
          const inbound = fromEmail === contactNorm || gm.from.toLowerCase().includes(contactNorm);

          const bodyText = gm.snippet || gm.subject || '(no content)';
          const at = new Date(gm.internalDateMs || Date.now());

          await tx.insert(message).values({
            orgId: data.orgId,
            conversationId: conv.id,
            contactId: row.id,
            channel: 'email',
            direction: inbound ? 'inbound' : 'outbound',
            purpose: 'conversation',
            subject: gm.subject || null,
            bodyText,
            preview: previewText({ bodyText }),
            fromAddress: gm.from || null,
            toAddress: gm.to || contactEmail,
            provider: 'google_mail',
            providerMessageId: gm.id,
            status: inbound ? 'delivered' : 'sent',
            sentByUserId: inbound ? null : data.userId,
            createdAt: at,
            updatedAt: at,
          });

          imported += 1;

          await tx
            .update(conversation)
            .set({
              lastMessageAt: at,
              lastChannel: 'email',
              updatedAt: new Date(),
              updatedBy: data.userId,
            })
            .where(eq(conversation.id, conv.id));
        }
      },
    );
  }

  const hasMore = loaded.contacts.length === CONTACTS_PER_RUN;
  let continuationOutboxId: string | null = null;

  await withTenant(
    { orgId: data.orgId, userId: data.userId, role: 'admin' },
    async (tx) => {
      if (hasMore) {
        const nextOffset = offset + CONTACTS_PER_RUN;
        continuationOutboxId = await enqueueOutbox(tx, {
          orgId: data.orgId,
          type: 'crm/mailbox.contact_backfill',
          payload: {
            orgId: data.orgId,
            mailboxId: data.mailboxId,
            userId: data.userId,
            offset: nextOffset,
          },
        });
        await tx
          .update(mailboxSyncState)
          .set({ backfillStatus: 'running' })
          .where(eq(mailboxSyncState.mailboxId, data.mailboxId));
      } else {
        await tx
          .update(mailboxSyncState)
          .set({ backfillStatus: 'complete' })
          .where(eq(mailboxSyncState.mailboxId, data.mailboxId));
        await tx
          .update(mailboxConnection)
          .set({ lastSyncedAt: new Date(), updatedAt: new Date(), updatedBy: data.userId })
          .where(eq(mailboxConnection.id, data.mailboxId));
      }
    },
  );

  if (continuationOutboxId) {
    const { dispatchOutboxEventIds } = await import('@/server/outbox/dispatch');
    await dispatchOutboxEventIds(data.orgId, [continuationOutboxId]);
  }

  return { outcome: hasMore ? `imported_${imported}_continuing` : `imported_${imported}_complete` };
}
