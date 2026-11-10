import 'server-only';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { bulkContactActionSchema } from '@/domain/contacts/mutation-schemas';
import { canContactSummary } from '@/domain/contacts/consent';
import type { z } from 'zod';
import { assertCan, ForbiddenError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import {
  contact,
  contactConsent,
  contactFollower,
  contactTag,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requestContactExport } from '@/server/services/contacts/contact-data-requests';
import { deleteContact } from '@/server/services/contacts/delete-contact';
import { setContactOwner } from '@/server/services/contacts/set-contact-owner';
import { setContactTags } from '@/server/services/contacts/set-contact-tags';
import { createOpportunity } from '@/server/services/opportunities/create-opportunity';
import { randomUUID } from 'node:crypto';

type Input = z.infer<typeof bulkContactActionSchema>;

const SYNC_LIMIT = 50;

export type BulkContactResult = {
  processed: number;
  skipped: number;
  skippedIds: string[];
  jobQueued?: boolean;
  email?: { sendable: number; skipped: number };
};

export async function runBulkContactAction(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<BulkContactResult> {
  assertCan(session, 'contact.update');

  if (input.contactIds.length > SYNC_LIMIT) {
    await writeAudit(tx, {
      orgId: session.orgId,
      actorType: 'user',
      actorId: session.userId,
      action: 'contact.bulk_action',
      entityType: 'contact',
      changes: { action: { to: input.action }, count: { to: input.contactIds.length } },
      metadata: { status: 'queued', contactIds: input.contactIds },
    });
    return {
      processed: 0,
      skipped: 0,
      skippedIds: [],
      jobQueued: true,
    };
  }

  const visibleRows = await tx
    .select({ id: contact.id })
    .from(contact)
    .where(
      and(
        eq(contact.orgId, session.orgId),
        inArray(contact.id, input.contactIds),
        isNull(contact.deletedAt),
      ),
    );

  const visibleIds = new Set(visibleRows.map((r) => r.id));
  const skippedIds = input.contactIds.filter((id) => !visibleIds.has(id));

  let processed = 0;

  async function loadRow(contactId: string) {
    const [row] = await tx
      .select({
        id: contact.id,
        version: contact.version,
        email: contact.email,
        phoneE164: contact.phoneE164,
        recipientType: contact.recipientType,
        restricted: contact.restricted,
      })
      .from(contact)
      .where(and(eq(contact.orgId, session.orgId), eq(contact.id, contactId)))
      .limit(1);
    return row;
  }

  switch (input.action) {
    case 'owner': {
      if (session.role === 'member') {
        throw new ForbiddenError('Members cannot bulk-change owners.');
      }
      for (const contactId of visibleIds) {
        const row = await loadRow(contactId);
        if (!row) continue;
        await setContactOwner(tx, session, {
          contactId: row.id,
          version: row.version,
          ownerId: input.ownerId,
        });
        processed += 1;
      }
      break;
    }
    case 'tag': {
      for (const contactId of visibleIds) {
        const row = await loadRow(contactId);
        if (!row) continue;
        let tagIds = input.tagIds;
        if (input.mode === 'add') {
          const existing = await tx
            .select({ tagId: contactTag.tagId })
            .from(contactTag)
            .where(
              and(eq(contactTag.orgId, session.orgId), eq(contactTag.contactId, row.id)),
            );
          tagIds = [...new Set([...existing.map((t) => t.tagId), ...input.tagIds])];
        }
        await setContactTags(tx, session, {
          contactId: row.id,
          version: row.version,
          tagIds,
        });
        processed += 1;
      }
      break;
    }
    case 'follow': {
      for (const contactId of visibleIds) {
        const [existing] = await tx
          .select({ id: contactFollower.id })
          .from(contactFollower)
          .where(
            and(
              eq(contactFollower.orgId, session.orgId),
              eq(contactFollower.contactId, contactId),
              eq(contactFollower.userId, session.userId),
            ),
          )
          .limit(1);
        if (!existing) {
          await tx.insert(contactFollower).values({
            orgId: session.orgId,
            contactId,
            userId: session.userId,
            createdBy: session.userId,
          });
        }
        processed += 1;
      }
      break;
    }
    case 'delete': {
      assertCan(session, 'contact.delete');
      for (const contactId of visibleIds) {
        const row = await loadRow(contactId);
        if (!row) continue;
        await deleteContact(tx, session, { contactId: row.id, version: row.version });
        processed += 1;
      }
      break;
    }
    case 'export': {
      assertCan(session, 'contact.restrict');
      for (const contactId of visibleIds) {
        await requestContactExport(tx, session, { contactId });
        processed += 1;
      }
      break;
    }
    case 'pipeline': {
      for (const contactId of visibleIds) {
        await createOpportunity(tx, session, {
          id: randomUUID(),
          contactId,
          pipelineId: input.pipelineId,
          stageId: input.stageId,
          name: 'New opportunity',
          valuePence: input.valuePence ?? 0,
        });
        processed += 1;
      }
      break;
    }
    case 'email': {
      let sendable = 0;
      let skippedEmail = 0;
      for (const contactId of visibleIds) {
        const row = await loadRow(contactId);
        if (!row) continue;
        const consentRows = await tx
          .select({
            channel: contactConsent.channel,
            dnd: contactConsent.dnd,
            marketingConsent: contactConsent.marketingConsent,
          })
          .from(contactConsent)
          .where(
            and(eq(contactConsent.orgId, session.orgId), eq(contactConsent.contactId, row.id)),
          );
        const summary = canContactSummary(
          {
            email: row.email,
            phoneE164: row.phoneE164,
            recipientType: row.recipientType,
            restricted: row.restricted,
          },
          consentRows.map((c) => ({
            channel: c.channel,
            dnd: c.dnd,
            marketingConsent: c.marketingConsent,
          })),
        );
        if (summary.email.allowed) {
          sendable += 1;
        } else {
          skippedEmail += 1;
          skippedIds.push(row.id);
        }
      }
      await writeAudit(tx, {
        orgId: session.orgId,
        actorType: 'user',
        actorId: session.userId,
        action: 'contact.bulk_action',
        entityType: 'contact',
        changes: { action: { to: 'email' } },
        metadata: { sendable, skipped: skippedEmail },
      });
      return {
        processed: visibleIds.size,
        skipped: skippedIds.length,
        skippedIds: [...new Set(skippedIds)],
        email: { sendable, skipped: skippedEmail },
      };
    }
    default:
      break;
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.bulk_action',
    entityType: 'contact',
    changes: { action: { to: input.action }, processed: { to: processed } },
  });

  return {
    processed,
    skipped: skippedIds.length,
    skippedIds,
  };
}
