import 'server-only';

import { randomUUID } from 'node:crypto';
import type { EntityRef } from '@/lib/entities/types';
import type { OrgAffectedEvent } from '@/lib/realtime/org-affected-event';
import { publishOrgBus } from '@/server/realtime/dev-org-bus';

/** Publishes after commit so other sessions can invalidate caches (dev SSE bus). */
export function publishOrgAffected(input: {
  orgId: string;
  actorId: string;
  affected: EntityRef[];
}): void {
  if (input.affected.length === 0) return;

  const event: OrgAffectedEvent = {
    id: randomUUID(),
    type: 'entities.affected',
    orgId: input.orgId,
    actorId: input.actorId,
    occurredAt: new Date().toISOString(),
    affected: input.affected,
  };

  publishOrgBus(input.orgId, JSON.stringify(event));
}
