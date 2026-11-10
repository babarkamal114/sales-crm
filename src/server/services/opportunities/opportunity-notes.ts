import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import type { CreateOpportunityNoteInput } from '@/domain/opportunities/collaboration-schemas';
import { writeAudit } from '@/server/audit/write';
import { opportunityNote, user } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  requireOpportunityAccess,
  touchOpportunityActivity,
} from '@/server/services/opportunities/opportunity-access';

export type OpportunityNoteView = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    initials: string;
  };
};

function noteInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export async function listOpportunityNotes(
  tx: DbTransaction,
  session: TenantSession,
  opportunityId: string,
  limit = 50,
): Promise<OpportunityNoteView[]> {
  await requireOpportunityAccess(tx, session, opportunityId);

  const rows = await tx
    .select({
      id: opportunityNote.id,
      body: opportunityNote.body,
      createdAt: opportunityNote.createdAt,
      authorId: user.id,
      authorName: user.fullName,
    })
    .from(opportunityNote)
    .innerJoin(user, eq(opportunityNote.createdBy, user.id))
    .where(
      and(
        eq(opportunityNote.orgId, session.orgId),
        eq(opportunityNote.opportunityId, opportunityId),
        isNull(opportunityNote.deletedAt),
      ),
    )
    .orderBy(desc(opportunityNote.createdAt))
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

export async function createOpportunityNote(
  tx: DbTransaction,
  session: TenantSession,
  input: CreateOpportunityNoteInput,
): Promise<{ id: string }> {
  const deal = await requireOpportunityAccess(tx, session, input.opportunityId);
  const now = new Date();

  const [row] = await tx
    .insert(opportunityNote)
    .values({
      orgId: session.orgId,
      contactId: deal.contactId,
      opportunityId: deal.id,
      body: input.body,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: opportunityNote.id });

  await touchOpportunityActivity(tx, session, deal.id, now);

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'opportunity.note_added',
    entityType: 'opportunity',
    entityId: deal.id,
    changes: { noteId: { from: null, to: row!.id } },
    metadata: { contactId: deal.contactId },
  });

  return { id: row!.id };
}
