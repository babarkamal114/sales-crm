import { jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { crmSchema, organisation } from '@/server/db/schema/membership';

export const auditActorTypeEnum = crmSchema.enum('audit_actor_type', [
  'user',
  'system',
  'webhook',
  'api_key',
]);

export const auditLog = crmSchema.table('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  occurredAt: timestamp('occurred_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  actorType: auditActorTypeEnum('actor_type').notNull(),
  actorId: text('actor_id').notNull(),
  onBehalfOf: uuid('on_behalf_of'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  changes: jsonb('changes').notNull().default({}),
  metadata: jsonb('metadata').notNull().default({}),
  prevHash: text('prev_hash'),
  hash: text('hash').notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
