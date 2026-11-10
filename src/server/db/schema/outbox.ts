import { index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { crmSchema, organisation } from '@/server/db/schema/membership';

export const outboxEvent = crmSchema.table(
  'outbox_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  },
  (table) => [index('crm_outbox_pending').on(table.orgId, table.createdAt)],
);

export type OutboxEvent = typeof outboxEvent.$inferSelect;
