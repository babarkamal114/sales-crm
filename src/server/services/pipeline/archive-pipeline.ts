import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import type { PipelineIdInput } from '@/domain/pipeline/schemas';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { pipeline } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export async function archivePipeline(
  tx: DbTransaction,
  session: TenantSession,
  input: PipelineIdInput,
): Promise<{ id: string }> {
  assertCan(session, 'settings.pipelines.manage');

  const [current] = await tx
    .select({ id: pipeline.id, isDefault: pipeline.isDefault, version: pipeline.version })
    .from(pipeline)
    .where(
      and(
        eq(pipeline.id, input.pipelineId),
        eq(pipeline.orgId, session.orgId),
        isNull(pipeline.archivedAt),
      ),
    )
    .limit(1);

  if (!current) {
    throw new NotFoundError('Pipeline not found.');
  }

  const now = new Date();
  await tx
    .update(pipeline)
    .set({
      archivedAt: now,
      isDefault: false,
      version: current.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
    })
    .where(
      and(
        eq(pipeline.id, current.id),
        eq(pipeline.orgId, session.orgId),
        eq(pipeline.version, current.version),
      ),
    );

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'pipeline.archived',
    entityType: 'pipeline',
    entityId: current.id,
    changes: {
      archivedAt: { from: null, to: now.toISOString() },
      ...(current.isDefault ? { isDefault: { from: true, to: false } } : {}),
    },
  });

  return { id: current.id };
}
