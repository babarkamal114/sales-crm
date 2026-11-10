import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { opportunity } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { assertCanAccessPipeline } from '@/server/access/pipeline-access';

export async function deleteOpportunity(
  tx: DbTransaction,
  session: TenantSession,
  opportunityId: string,
): Promise<{ id: string }> {
  assertCan(session, 'opportunity.delete');

  const [deal] = await tx
    .select()
    .from(opportunity)
    .where(
      and(
        eq(opportunity.orgId, session.orgId),
        eq(opportunity.id, opportunityId),
        isNull(opportunity.deletedAt),
      ),
    )
    .limit(1);

  if (!deal) {
    throw new NotFoundError('Opportunity not found.');
  }

  await assertCanAccessPipeline(tx, session, deal.pipelineId);

  const now = new Date();
  await tx
    .update(opportunity)
    .set({
      deletedAt: now,
      updatedAt: now,
      updatedBy: session.userId,
      version: deal.version + 1,
    })
    .where(eq(opportunity.id, deal.id));

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'opportunity.deleted',
    entityType: 'opportunity',
    entityId: deal.id,
    changes: { deletedAt: { from: null, to: now.toISOString() } },
  });

  return { id: deal.id };
}
