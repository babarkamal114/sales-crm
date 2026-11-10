import { index, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { contact, opportunity } from '@/server/db/schema/pipeline';
import { crmSchema, organisation, user } from '@/server/db/schema/membership';

export const opportunityNote = crmSchema.table(
  'opportunity_note',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    opportunityId: uuid('opportunity_id')
      .notNull()
      .references(() => opportunity.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => user.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('crm_opportunity_note_org_opportunity').on(table.orgId, table.opportunityId),
  ],
);

export const opportunityTask = crmSchema.table(
  'opportunity_task',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    opportunityId: uuid('opportunity_id')
      .notNull()
      .references(() => opportunity.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    assigneeId: uuid('assignee_id').references(() => user.id, { onDelete: 'set null' }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedBy: uuid('completed_by').references(() => user.id, { onDelete: 'set null' }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => user.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('crm_opportunity_task_org_opportunity').on(table.orgId, table.opportunityId),
    index('crm_opportunity_task_org_assignee').on(table.orgId, table.assigneeId),
  ],
);

export type OpportunityNote = typeof opportunityNote.$inferSelect;
export type OpportunityTask = typeof opportunityTask.$inferSelect;
