import 'server-only';

import type { EntityRef } from '@/lib/entities/types';
import { publishOrgAffected } from '@/server/realtime/publish-affected';

export function broadcastAffectedAfterAction(input: {
  orgId: string;
  actorId: string;
  affected?: EntityRef[];
}): void {
  if (!input.affected?.length) return;
  publishOrgAffected({
    orgId: input.orgId,
    actorId: input.actorId,
    affected: input.affected,
  });
}
