import type { CrmRole } from '@/server/db/schema';

export type Capability =
  | 'opportunity.create'
  | 'opportunity.update'
  | 'opportunity.move'
  | 'opportunity.delete'
  | 'opportunity.view'
  | 'contact.view'
  | 'contact.create'
  | 'contact.update'
  | 'contact.delete'
  | 'contact.merge'
  | 'contact.restrict'
  | 'settings.pipelines.manage';

const ROLE_CAPABILITIES: Record<CrmRole, ReadonlySet<Capability>> = {
  admin: new Set([
    'opportunity.create',
    'opportunity.update',
    'opportunity.move',
    'opportunity.delete',
    'opportunity.view',
    'contact.view',
    'contact.create',
    'contact.update',
    'contact.delete',
    'contact.merge',
    'contact.restrict',
    'settings.pipelines.manage',
  ]),
  manager: new Set([
    'opportunity.create',
    'opportunity.update',
    'opportunity.move',
    'opportunity.delete',
    'opportunity.view',
    'contact.view',
    'contact.create',
    'contact.update',
    'contact.delete',
    'contact.merge',
  ]),
  member: new Set([
    'opportunity.create',
    'opportunity.update',
    'opportunity.move',
    'opportunity.delete',
    'opportunity.view',
    'contact.view',
    'contact.create',
    'contact.update',
  ]),
};

export function can(session: { role: CrmRole }, capability: Capability): boolean {
  return ROLE_CAPABILITIES[session.role]?.has(capability) ?? false;
}

export function assertCan(
  session: { role: CrmRole },
  capability: Capability,
): void {
  if (!can(session, capability)) {
    throw new ForbiddenError('You do not have permission to do that.');
  }
}

export class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN' as const;

  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const;

  constructor(message = 'Not found.') {
    super(message);
    this.name = 'NotFoundError';
  }
}
