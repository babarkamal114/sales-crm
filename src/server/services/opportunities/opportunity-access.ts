import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { assertCanAccessPipeline } from '@/server/access/pipeline-access';
import { opportunity } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export type OpportunityAccessRow = {
  id: string;
  contactId: string;
  pipelineId: string;
};

export async function requireOpportunityAccess(
  tx: DbTransaction,
  session: TenantSession,
  opportunityId: string,
): Promise<OpportunityAccessRow> {
  assertCan(session, 'opportunity.view');

  const [row] = await tx
    .select({
      id: opportunity.id,
      contactId: opportunity.contactId,
      pipelineId: opportunity.pipelineId,
    })
    .from(opportunity)
    .where(
      and(
        eq(opportunity.orgId, session.orgId),
        eq(opportunity.id, opportunityId),
        isNull(opportunity.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError('Opportunity not found.');
  }

  await assertCanAccessPipeline(tx, session, row.pipelineId);
  return row;
}

export async function touchOpportunityActivity(
  tx: DbTransaction,
  session: TenantSession,
  opportunityId: string,
  at: Date,
): Promise<void> {
  await tx
    .update(opportunity)
    .set({
      lastActivityAt: at,
      updatedAt: at,
      updatedBy: session.userId,
    })
    .where(
      and(
        eq(opportunity.orgId, session.orgId),
        eq(opportunity.id, opportunityId),
        isNull(opportunity.deletedAt),
      ),
    );
}
