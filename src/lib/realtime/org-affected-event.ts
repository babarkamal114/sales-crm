import type { EntityRef } from '@/lib/entities/types';

/** Minimal org broadcast after commit — IDs only (rule 27). */
export type OrgAffectedEvent = {
  id: string;
  type: 'entities.affected';
  orgId: string;
  actorId: string;
  occurredAt: string;
  affected: EntityRef[];
};

export function orgChannelName(orgId: string): string {
  return `org:${orgId}`;
}
