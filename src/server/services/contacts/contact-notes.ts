import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import type { CreateContactNoteInput } from '@/domain/contacts/collaboration-schemas';
import type { ContactNoteView } from '@/domain/contacts/collaboration-view';
import { assertCan } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { contactNote, user } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  requireContactView,
  touchContactActivity,
} from '@/server/services/contacts/contact-access';

function noteInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export async function listContactNotes(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
  limit = 50,
): Promise<ContactNoteView[]> {
  assertCan(session, 'contact.view');
  await requireContactView(tx, session, contactId);

  const rows = await tx
    .select({
      id: contactNote.id,
      body: contactNote.body,
      createdAt: contactNote.createdAt,
      authorId: user.id,
      authorName: user.fullName,
    })
    .from(contactNote)
    .innerJoin(user, eq(contactNote.createdBy, user.id))
    .where(
      and(
        eq(contactNote.orgId, session.orgId),
        eq(contactNote.contactId, contactId),
        isNull(contactNote.deletedAt),
      ),
    )
    .orderBy(desc(contactNote.createdAt))
    .limit(limit);

  return rows.map((row) => {
    const name = row.authorName?.trim() || 'User';
    return {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: {
        id: row.authorId,
        fullName: name,
        initials: noteInitials(name),
      },
    };
  });
}

export async function createContactNote(
  tx: DbTransaction,
  session: TenantSession,
  input: CreateContactNoteInput,
): Promise<{ id: string }> {
  assertCan(session, 'contact.view');
  const c = await requireContactView(tx, session, input.contactId);

  if (c.restricted) {
    throw new Error('This contact is restricted.');
  }

  const now = new Date();

  const [row] = await tx
    .insert(contactNote)
    .values({
      orgId: session.orgId,
      contactId: c.id,
      body: input.body,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: contactNote.id });

  await touchContactActivity(tx, session, c.id, now);

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.note_added',
    entityType: 'contact',
    entityId: c.id,
    changes: { noteId: { from: null, to: row!.id } },
  });

  return { id: row!.id };
}
