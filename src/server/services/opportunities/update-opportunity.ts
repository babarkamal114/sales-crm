import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import type { UpdateOpportunityInput } from '@/domain/opportunities/schemas';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { assertCanAccessPipeline } from '@/server/access/pipeline-access';
import { writeAudit } from '@/server/audit/write';
import { opportunity } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export async function updateOpportunity(
  tx: DbTransaction,
  session: TenantSession,
  input: UpdateOpportunityInput,
): Promise<{ id: string; version: number }> {
  assertCan(session, 'opportunity.update');

  const [deal] = await tx
    .select()
    .from(opportunity)
    .where(
      and(
        eq(opportunity.orgId, session.orgId),
        eq(opportunity.id, input.opportunityId),
        isNull(opportunity.deletedAt),
      ),
    )
    .limit(1);

  if (!deal) {
    throw new NotFoundError('Opportunity not found.');
  }

  await assertCanAccessPipeline(tx, session, deal.pipelineId);

  if (deal.version !== input.version) {
    const err = new Error('Version conflict.');
    (err as Error & { code: string }).code = 'CONFLICT';
    throw err;
  }

  const now = new Date();
  const patch: Partial<typeof deal> = {
    updatedAt: now,
    updatedBy: session.userId,
    version: deal.version + 1,
    lastActivityAt: now,
  };

  const changes: Record<string, { from: unknown; to: unknown }> = {};

  if (input.name !== undefined && input.name !== deal.name) {
    patch.name = input.name;
    changes.name = { from: deal.name, to: input.name };
  }
  if (input.valuePence !== undefined && input.valuePence !== deal.valuePence) {
    patch.valuePence = input.valuePence;
    changes.valuePence = { from: deal.valuePence, to: input.valuePence };
  }
  if (
    input.expectedCloseDate !== undefined &&
    input.expectedCloseDate !== deal.expectedCloseDate
  ) {
    patch.expectedCloseDate = input.expectedCloseDate;
    changes.expectedCloseDate = {
      from: deal.expectedCloseDate,
      to: input.expectedCloseDate,
    };
  }

  if (Object.keys(changes).length === 0) {
    return { id: deal.id, version: deal.version };
  }

  const [updated] = await tx
    .update(opportunity)
    .set(patch)
    .where(and(eq(opportunity.id, deal.id), eq(opportunity.version, deal.version)))
    .returning({ id: opportunity.id, version: opportunity.version });

  if (!updated) {
    const err = new Error('Version conflict.');
    (err as Error & { code: string }).code = 'CONFLICT';
    throw err;
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'opportunity.updated',
    entityType: 'opportunity',
    entityId: deal.id,
    changes,
  });

  return { id: updated.id, version: updated.version };
}
