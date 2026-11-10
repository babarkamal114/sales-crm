import 'server-only';

import { createHash } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import type { AuditAction, AuditActorType } from '@/domain/audit/actions';
import { auditLog } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

export type AuditWriteInput = {
  orgId: string;
  actorType: AuditActorType;
  actorId: string;
  onBehalfOf?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

function computeAuditHash(input: {
  orgId: string;
  occurredAt: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  changes: Record<string, unknown>;
  prevHash: string | null;
}): string {
  const payload = JSON.stringify({
    orgId: input.orgId,
    occurredAt: input.occurredAt,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    changes: input.changes,
    prevHash: input.prevHash,
  });
  return createHash('sha256').update(payload).digest('hex');
}

export async function writeAudit(
  tx: DbTransaction,
  input: AuditWriteInput,
): Promise<void> {
  const [last] = await tx
    .select({ hash: auditLog.hash })
    .from(auditLog)
    .where(eq(auditLog.orgId, input.orgId))
    .orderBy(desc(auditLog.occurredAt))
    .limit(1);

  const occurredAt = new Date();
  const changes = input.changes ?? {};
  const prevHash = last?.hash ?? null;
  const hash = computeAuditHash({
    orgId: input.orgId,
    occurredAt: occurredAt.toISOString(),
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    changes,
    prevHash,
  });

  await tx.insert(auditLog).values({
    orgId: input.orgId,
    occurredAt,
    actorType: input.actorType,
    actorId: input.actorId,
    onBehalfOf: input.onBehalfOf ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    changes,
    metadata: input.metadata ?? {},
    prevHash,
    hash,
  });
}
