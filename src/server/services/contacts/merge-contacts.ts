import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import type { mergeContactsSchema } from '@/domain/contacts/mutation-schemas';
import { mergeContacts as mergeContactsDomain } from '@/domain/contacts/merge';
import { normaliseEmail } from '@/domain/contacts/normalise';
import type { z } from 'zod';
import { NotFoundError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import {
  attribution,
  contact,
  contactConsent,
  contactMergeLog,
  contactTag,
  opportunity,
  contactNote,
  contactTask,
  opportunityNote,
  opportunityTask,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertContactVersion,
  requireContact,
  touchContactActivity,
  VersionConflictError,
} from '@/server/services/contacts/contact-access';

type Input = z.infer<typeof mergeContactsSchema>;

async function loadMergeSnapshot(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
) {
  const [row] = await tx
    .select()
    .from(contact)
    .where(
      and(
        eq(contact.orgId, session.orgId),
        eq(contact.id, contactId),
        isNull(contact.deletedAt),
        isNull(contact.mergedIntoId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError('Contact not found.');
  }

  const consentRows = await tx
    .select({
      channel: contactConsent.channel,
      dnd: contactConsent.dnd,
      marketingConsent: contactConsent.marketingConsent,
    })
    .from(contactConsent)
    .where(
      and(eq(contactConsent.orgId, session.orgId), eq(contactConsent.contactId, contactId)),
    );

  return {
    row,
    snapshot: {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phoneE164: row.phoneE164,
      jobTitle: row.jobTitle,
      companyId: row.companyId,
      ownerId: row.ownerId,
      lifecycle: row.lifecycle,
      source: row.source,
      consent: consentRows.map((c) => ({
        channel: c.channel,
        dnd: c.dnd,
        marketingConsent: c.marketingConsent,
      })),
    },
  };
}

export async function mergeContacts(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ survivingId: string; mergedId: string; version: number }> {
  await requireContact(tx, session, input.primaryContactId, 'contact.merge');
  if (input.primaryContactId === input.secondaryContactId) {
    throw new Error('Cannot merge a contact with itself.');
  }

  const primary = await loadMergeSnapshot(tx, session, input.primaryContactId);
  const secondary = await loadMergeSnapshot(tx, session, input.secondaryContactId);

  assertContactVersion(primary.row, input.primaryVersion);

  const oppRows = await tx
    .select({ id: opportunity.id })
    .from(opportunity)
    .where(
      and(
        eq(opportunity.orgId, session.orgId),
        eq(opportunity.contactId, secondary.row.id),
        isNull(opportunity.deletedAt),
      ),
    );

  const result = mergeContactsDomain(
    primary.snapshot,
    secondary.snapshot,
    input.choices ?? {},
    {
      opportunityIds: oppRows.map((o) => o.id),
      noteIds: [],
      taskIds: [],
    },
  );

  const now = new Date();
  const emailNormalised = normaliseEmail(result.merged.email);
  const phoneE164 = result.merged.phoneE164;

  const [updatedPrimary] = await tx
    .update(contact)
    .set({
      displayName: result.merged.displayName,
      firstName: result.merged.firstName ?? primary.row.firstName,
      lastName: result.merged.lastName ?? '',
      email: result.merged.email,
      emailNormalised,
      phoneE164,
      jobTitle: result.merged.jobTitle,
      companyId: result.merged.companyId,
      ownerId: result.merged.ownerId,
      lifecycle: result.merged.lifecycle as typeof primary.row.lifecycle,
      source: result.merged.source,
      version: primary.row.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
      lastActivityAt: now,
    })
    .where(
      and(eq(contact.id, primary.row.id), eq(contact.version, primary.row.version)),
    )
    .returning({ id: contact.id, version: contact.version });

  if (!updatedPrimary) {
    throw new VersionConflictError();
  }

  for (const oppId of result.relatedRecordsToMove.opportunities) {
    await tx
      .update(opportunity)
      .set({
        contactId: primary.row.id,
        updatedAt: now,
        updatedBy: session.userId,
      })
      .where(and(eq(opportunity.id, oppId), eq(opportunity.orgId, session.orgId)));
  }

  await tx
    .update(opportunityNote)
    .set({ contactId: primary.row.id, updatedAt: now, updatedBy: session.userId })
    .where(
      and(eq(opportunityNote.orgId, session.orgId), eq(opportunityNote.contactId, secondary.row.id)),
    );

  await tx
    .update(opportunityTask)
    .set({ contactId: primary.row.id, updatedAt: now, updatedBy: session.userId })
    .where(
      and(eq(opportunityTask.orgId, session.orgId), eq(opportunityTask.contactId, secondary.row.id)),
    );

  await tx
    .update(contactNote)
    .set({ contactId: primary.row.id, updatedAt: now, updatedBy: session.userId })
    .where(
      and(eq(contactNote.orgId, session.orgId), eq(contactNote.contactId, secondary.row.id)),
    );

  await tx
    .update(contactTask)
    .set({ contactId: primary.row.id, updatedAt: now, updatedBy: session.userId })
    .where(
      and(eq(contactTask.orgId, session.orgId), eq(contactTask.contactId, secondary.row.id)),
    );

  const secondaryAttribution = await tx
    .select()
    .from(attribution)
    .where(
      and(eq(attribution.orgId, session.orgId), eq(attribution.contactId, secondary.row.id)),
    );

  for (const row of secondaryAttribution) {
    const [primaryTouch] = await tx
      .select({ id: attribution.id })
      .from(attribution)
      .where(
        and(
          eq(attribution.orgId, session.orgId),
          eq(attribution.contactId, primary.row.id),
          eq(attribution.touch, row.touch),
        ),
      )
      .limit(1);

    if (primaryTouch) {
      await tx.delete(attribution).where(eq(attribution.id, row.id));
    } else {
      await tx
        .update(attribution)
        .set({ contactId: primary.row.id })
        .where(eq(attribution.id, row.id));
    }
  }

  const secondaryTags = await tx
    .select({ tagId: contactTag.tagId })
    .from(contactTag)
    .where(
      and(eq(contactTag.orgId, session.orgId), eq(contactTag.contactId, secondary.row.id)),
    );

  const primaryTags = await tx
    .select({ tagId: contactTag.tagId })
    .from(contactTag)
    .where(
      and(eq(contactTag.orgId, session.orgId), eq(contactTag.contactId, primary.row.id)),
    );

  const primaryTagIds = new Set(primaryTags.map((t) => t.tagId));
  for (const { tagId } of secondaryTags) {
    if (!primaryTagIds.has(tagId)) {
      await tx.insert(contactTag).values({
        orgId: session.orgId,
        contactId: primary.row.id,
        tagId,
      });
    }
  }

  for (const channelRow of result.consent) {
    const [existing] = await tx
      .select({ id: contactConsent.id })
      .from(contactConsent)
      .where(
        and(
          eq(contactConsent.orgId, session.orgId),
          eq(contactConsent.contactId, primary.row.id),
          eq(contactConsent.channel, channelRow.channel),
        ),
      )
      .limit(1);

    if (existing) {
      await tx
        .update(contactConsent)
        .set({
          dnd: channelRow.dnd,
          marketingConsent: channelRow.marketingConsent,
          updatedAt: now,
          updatedBy: session.userId,
        })
        .where(eq(contactConsent.id, existing.id));
    } else {
      await tx.insert(contactConsent).values({
        orgId: session.orgId,
        contactId: primary.row.id,
        channel: channelRow.channel,
        dnd: channelRow.dnd,
        marketingConsent: channelRow.marketingConsent,
        updatedAt: now,
        updatedBy: session.userId,
      });
    }
  }

  await tx
    .update(contact)
    .set({
      mergedIntoId: primary.row.id,
      deletedAt: now,
      version: secondary.row.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
    })
    .where(eq(contact.id, secondary.row.id));

  await tx.insert(contactMergeLog).values({
    orgId: session.orgId,
    survivingId: primary.row.id,
    mergedId: secondary.row.id,
    fieldChoices: input.choices ?? {},
    mergedBy: session.userId,
    mergedAt: now,
  });

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.merged',
    entityType: 'contact',
    entityId: primary.row.id,
    changes: {
      mergedContactId: { to: secondary.row.id },
      fieldChoices: { to: input.choices ?? {} },
    },
    metadata: { secondaryContactId: secondary.row.id },
  });

  await touchContactActivity(tx, session, primary.row.id, now);

  return {
    survivingId: primary.row.id,
    mergedId: secondary.row.id,
    version: updatedPrimary.version,
  };
}
