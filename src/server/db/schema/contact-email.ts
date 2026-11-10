import { boolean, index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { contact } from '@/server/db/schema/pipeline';
import { crmSchema, organisation, user } from '@/server/db/schema/membership';

export const contactEmailTemplate = crmSchema.table(
  'contact_email_template',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    stepKey: text('step_key').notNull(),
    name: text('name').notNull(),
    subject: text('subject').notNull(),
    bodyHtml: text('body_html').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isSystem: boolean('is_system').notNull().default(false),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => user.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('crm_contact_email_template_org_sort').on(table.orgId, table.sortOrder),
  ],
);

export const contactEmailSend = crmSchema.table(
  'contact_email_send',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').references(() => contactEmailTemplate.id, {
      onDelete: 'set null',
    }),
    stepKey: text('step_key'),
    toAddress: text('to_address').notNull(),
    subject: text('subject').notNull(),
    bodyHtml: text('body_html').notNull(),
    status: text('status').notNull().default('sent'),
    errorMessage: text('error_message'),
    providerMessageId: text('provider_message_id'),
    providerThreadId: text('provider_thread_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    index('crm_contact_email_send_org_contact').on(table.orgId, table.contactId, table.createdAt),
  ],
);

export type ContactEmailTemplate = typeof contactEmailTemplate.$inferSelect;
export type ContactEmailSend = typeof contactEmailSend.$inferSelect;
