import 'server-only';

import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import type {
  deleteSmartListSchema,
  reorderSmartListsSchema,
  smartListMutationSchema,
  updateSmartListSchema,
} from '@/domain/contacts/mutation-schemas';
import type { z } from 'zod';
import { assertCan, ForbiddenError, NotFoundError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { smartList } from '@/server/db/schema';
import type { CrmRole } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export type SmartListItem = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  columns: unknown[];
  position: number;
  isMine: boolean;
  isShared: boolean;
  canDelete: boolean;
  canEdit: boolean;
};

export function canShareSmartListsWithTeam(role: CrmRole): boolean {
  return role === 'admin' || role === 'manager';
}

function canDeleteSmartList(session: TenantSession, ownerId: string | null): boolean {
  if (ownerId === null) {
    return canShareSmartListsWithTeam(session.role);
  }
  if (ownerId === session.userId) {
    return true;
  }
  return session.role === 'admin';
}

function canEditSmartList(session: TenantSession, ownerId: string | null): boolean {
  if (ownerId === null) {
    return canShareSmartListsWithTeam(session.role);
  }
  if (ownerId === session.userId) {
    return true;
  }
  return session.role === 'admin';
}

type CreateInput = z.infer<typeof smartListMutationSchema>;
type UpdateInput = z.infer<typeof updateSmartListSchema>;
type DeleteInput = z.infer<typeof deleteSmartListSchema>;
type ReorderInput = z.infer<typeof reorderSmartListsSchema>;

export async function listSmartLists(
  tx: DbTransaction,
  session: TenantSession,
): Promise<SmartListItem[]> {
  assertCan(session, 'contact.view');

  const rows = await tx
    .select()
    .from(smartList)
    .where(
      and(
        eq(smartList.orgId, session.orgId),
        or(isNull(smartList.ownerId), eq(smartList.ownerId, session.userId)),
      ),
    )
    .orderBy(asc(smartList.position), asc(smartList.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    filters: (row.filters as Record<string, unknown>) ?? {},
    sort: (row.sort as Record<string, unknown>) ?? {},
    columns: (row.columns as unknown[]) ?? [],
    position: row.position,
    isMine: row.ownerId === session.userId,
    isShared: row.ownerId === null,
    canDelete: canDeleteSmartList(session, row.ownerId),
    canEdit: canEditSmartList(session, row.ownerId),
  }));
}

export async function createSmartList(
  tx: DbTransaction,
  session: TenantSession,
  input: CreateInput,
): Promise<{ id: string }> {
  assertCan(session, 'contact.update');

  const shared = input.shared === true;
  if (shared && !canShareSmartListsWithTeam(session.role)) {
    throw new ForbiddenError('Only admins and managers can share smart lists with the team.');
  }

  const [maxRow] = await tx
    .select({ position: smartList.position })
    .from(smartList)
    .where(eq(smartList.orgId, session.orgId))
    .orderBy(desc(smartList.position))
    .limit(1);

  const position = (maxRow?.position ?? -1) + 1;

  const [row] = await tx
    .insert(smartList)
    .values({
      orgId: session.orgId,
      name: input.name,
      ownerId: shared ? null : session.userId,
      filters: input.filters,
      sort: input.sort,
      columns: input.columns,
      position,
      createdBy: session.userId,
      updatedBy: session.userId,
    })
    .returning({ id: smartList.id });

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'smart_list.created',
    entityType: 'smart_list',
    entityId: row!.id,
    changes: { name: { to: input.name } },
  });

  return { id: row!.id };
}

export async function updateSmartList(
  tx: DbTransaction,
  session: TenantSession,
  input: UpdateInput,
): Promise<{ id: string }> {
  assertCan(session, 'contact.update');

  const [existing] = await tx
    .select()
    .from(smartList)
    .where(and(eq(smartList.orgId, session.orgId), eq(smartList.id, input.smartListId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Smart list not found.');
  }

  if (existing.ownerId === null && !canShareSmartListsWithTeam(session.role)) {
    throw new ForbiddenError('You cannot edit team smart lists.');
  }
  if (existing.ownerId !== null && existing.ownerId !== session.userId && session.role === 'member') {
    throw new ForbiddenError('You can only edit your own smart lists.');
  }

  let nextOwnerId = existing.ownerId;
  if (input.shared === true) {
    if (!canShareSmartListsWithTeam(session.role)) {
      throw new ForbiddenError('Only admins and managers can share smart lists with the team.');
    }
    nextOwnerId = null;
  } else if (input.shared === false && existing.ownerId === null) {
    nextOwnerId = session.userId;
  }

  await tx
    .update(smartList)
    .set({
      name: input.name,
      ownerId: nextOwnerId,
      filters: input.filters,
      sort: input.sort,
      columns: input.columns,
      updatedAt: new Date(),
      updatedBy: session.userId,
    })
    .where(eq(smartList.id, existing.id));

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'smart_list.updated',
    entityType: 'smart_list',
    entityId: existing.id,
    changes: { name: { from: existing.name, to: input.name } },
  });

  return { id: existing.id };
}

export async function deleteSmartList(
  tx: DbTransaction,
  session: TenantSession,
  input: DeleteInput,
): Promise<{ id: string }> {
  assertCan(session, 'contact.update');

  const [existing] = await tx
    .select()
    .from(smartList)
    .where(and(eq(smartList.orgId, session.orgId), eq(smartList.id, input.smartListId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Smart list not found.');
  }

  if (!canDeleteSmartList(session, existing.ownerId)) {
    throw new ForbiddenError('You cannot delete this smart list.');
  }

  await tx.delete(smartList).where(eq(smartList.id, existing.id));

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'smart_list.deleted',
    entityType: 'smart_list',
    entityId: existing.id,
    changes: { deleted: { to: true } },
  });

  return { id: existing.id };
}

export async function reorderSmartLists(
  tx: DbTransaction,
  session: TenantSession,
  input: ReorderInput,
): Promise<{ ok: true }> {
  assertCan(session, 'contact.update');

  const rows = await tx
    .select({ id: smartList.id, ownerId: smartList.ownerId })
    .from(smartList)
    .where(and(eq(smartList.orgId, session.orgId), inArray(smartList.id, input.orderedIds)));

  if (rows.length !== input.orderedIds.length) {
    throw new NotFoundError('One or more smart lists were not found.');
  }

  if (session.role === 'member') {
    const allMine = rows.every((r) => r.ownerId === session.userId);
    if (!allMine) {
      throw new ForbiddenError('You can only reorder your own smart lists.');
    }
  }

  await Promise.all(
    input.orderedIds.map((id, index) =>
      tx
        .update(smartList)
        .set({ position: index, updatedAt: new Date(), updatedBy: session.userId })
        .where(and(eq(smartList.id, id), eq(smartList.orgId, session.orgId))),
    ),
  );

  return { ok: true };
}

export { createSmartList as saveSmartList };
