import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import type { setContactTagsSchema } from '@/domain/contacts/mutation-schemas';
import type { z } from 'zod';
import { writeAudit } from '@/server/audit/write';
import { contact, contactTag, tag } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertContactVersion,
  requireContact,
  touchContactActivity,
  VersionConflictError,
} from '@/server/services/contacts/contact-access';

type Input = z.infer<typeof setContactTagsSchema>;

export async function setContactTags(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string; version: number }> {
  const row = await requireContact(tx, session, input.contactId);
  assertContactVersion(row, input.version);

  const uniqueTagIds = [...new Set(input.tagIds)];
  if (uniqueTagIds.length > 0) {
    const tags = await tx
      .select({ id: tag.id })
      .from(tag)
      .where(and(eq(tag.orgId, session.orgId), inArray(tag.id, uniqueTagIds)));
    if (tags.length !== uniqueTagIds.length) {
      throw new Error('One or more tags were not found.');
    }
  }

  const existing = await tx
    .select({ tagId: contactTag.tagId })
    .from(contactTag)
    .where(and(eq(contactTag.orgId, session.orgId), eq(contactTag.contactId, row.id)));

  const existingIds = new Set(existing.map((r) => r.tagId));
  const targetIds = new Set(uniqueTagIds);
  const toRemove = [...existingIds].filter((id) => !targetIds.has(id));
  const toAdd = uniqueTagIds.filter((id) => !existingIds.has(id));

  if (toRemove.length === 0 && toAdd.length === 0) {
    return { id: row.id, version: row.version };
  }

  const now = new Date();

  if (toRemove.length > 0) {
    await tx
      .delete(contactTag)
      .where(
        and(
          eq(contactTag.orgId, session.orgId),
          eq(contactTag.contactId, row.id),
          inArray(contactTag.tagId, toRemove),
        ),
      );
  }

  if (toAdd.length > 0) {
    await tx.insert(contactTag).values(
      toAdd.map((tagId) => ({
        orgId: session.orgId,
        contactId: row.id,
        tagId,
      })),
    );
  }

  const [updated] = await tx
    .update(contact)
    .set({
      version: row.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
      lastActivityAt: now,
    })
    .where(and(eq(contact.id, row.id), eq(contact.version, row.version)))
    .returning({ id: contact.id, version: contact.version });

  if (!updated) {
    throw new VersionConflictError();
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.tags_changed',
    entityType: 'contact',
    entityId: row.id,
    changes: { tagIds: { from: [...existingIds], to: uniqueTagIds } },
  });

  await touchContactActivity(tx, session, row.id, now);
  return updated;
}
