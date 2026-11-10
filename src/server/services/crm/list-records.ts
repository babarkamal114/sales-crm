import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import { contact, opportunity, pipeline, pipelineStage } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

export async function listOrgContacts(
  tx: DbTransaction,
  orgId: string,
  limit = 50,
) {
  return tx
    .select({
      id: contact.id,
      displayName: contact.displayName,
      email: contact.email,
      createdAt: contact.createdAt,
    })
    .from(contact)
    .where(eq(contact.orgId, orgId))
    .orderBy(desc(contact.createdAt))
    .limit(limit);
}

export async function listOrgOpenOpportunities(
  tx: DbTransaction,
  orgId: string,
  limit = 50,
) {
  return tx
    .select({
      id: opportunity.id,
      name: opportunity.name,
      valuePence: opportunity.valuePence,
      status: opportunity.status,
      stageName: pipelineStage.name,
      pipelineName: pipeline.name,
      createdAt: opportunity.createdAt,
    })
    .from(opportunity)
    .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
    .innerJoin(pipeline, eq(opportunity.pipelineId, pipeline.id))
    .where(
      and(
        eq(opportunity.orgId, orgId),
        eq(opportunity.status, 'open'),
        isNull(opportunity.deletedAt),
      ),
    )
    .orderBy(desc(opportunity.createdAt))
    .limit(limit);
}
