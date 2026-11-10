import 'server-only';

import { and, asc, eq, isNull, or } from 'drizzle-orm';
import {
  type CreateSavedViewInput,
  type SavedViewFilters,
  type SavedViewListItem,
  savedViewFiltersSchema,
} from '@/domain/opportunities/saved-view';
import {
  assertCan,
  ForbiddenError,
  NotFoundError,
} from '@/server/access/capabilities';
import type { CrmRole } from '@/server/db/schema';
import { assertCanAccessPipeline } from '@/server/access/pipeline-access';
import { savedView } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

function parseStoredFilters(raw: unknown): SavedViewFilters {
  const parsed = savedViewFiltersSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

export function canShareSavedViewsWithTeam(role: CrmRole): boolean {
  return role === 'admin' || role === 'manager';
}

function canDeleteSavedView(
  session: TenantSession,
  ownerId: string | null,
): boolean {
  if (ownerId === null) {
    return canShareSavedViewsWithTeam(session.role);
  }
  if (ownerId === session.userId) {
    return true;
  }
  return session.role === 'admin';
}

export async function listSavedViews(
  tx: DbTransaction,
  session: TenantSession,
  pipelineId: string,
  scope: 'board' | 'list',
): Promise<SavedViewListItem[]> {
  assertCan(session, 'opportunity.view');
  await assertCanAccessPipeline(tx, session, pipelineId);

  const rows = await tx
    .select()
    .from(savedView)
    .where(
      and(
        eq(savedView.orgId, session.orgId),
        eq(savedView.pipelineId, pipelineId),
        eq(savedView.scope, scope),
        or(isNull(savedView.ownerId), eq(savedView.ownerId, session.userId)),
      ),
    )
    .orderBy(asc(savedView.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    scope: row.scope,
    pipelineId: row.pipelineId!,
    filters: parseStoredFilters(row.filters),
    isMine: row.ownerId === session.userId,
    isShared: row.ownerId === null,
    canDelete: canDeleteSavedView(session, row.ownerId),
  }));
}

export async function createSavedView(
  tx: DbTransaction,
  session: TenantSession,
  input: CreateSavedViewInput,
): Promise<{ id: string }> {
  assertCan(session, 'opportunity.view');
  await assertCanAccessPipeline(tx, session, input.pipelineId);

  const shared = input.shared === true;
  if (shared && !canShareSavedViewsWithTeam(session.role)) {
    throw new ForbiddenError('Only admins and managers can share views with the team.');
  }

  const [row] = await tx
    .insert(savedView)
    .values({
      orgId: session.orgId,
      name: input.name,
      ownerId: shared ? null : session.userId,
      scope: input.scope,
      pipelineId: input.pipelineId,
      filters: input.filters,
      sort: {},
      columns: [],
      createdBy: session.userId,
      updatedBy: session.userId,
    })
    .returning({ id: savedView.id });

  return { id: row!.id };
}

export async function deleteSavedView(
  tx: DbTransaction,
  session: TenantSession,
  savedViewId: string,
): Promise<void> {
  assertCan(session, 'opportunity.view');

  const [row] = await tx
    .select()
    .from(savedView)
    .where(and(eq(savedView.orgId, session.orgId), eq(savedView.id, savedViewId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Saved view not found.');
  }

  if (!canDeleteSavedView(session, row.ownerId)) {
    throw new ForbiddenError('You cannot delete this view.');
  }

  await tx.delete(savedView).where(eq(savedView.id, savedViewId));
}
