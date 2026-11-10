import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { contact } from '@/server/db/schema/pipeline';
import { crmSchema, organisation, user } from '@/server/db/schema/membership';

export const contactEmailReplyDraft = crmSchema.table(
  'contact_email_reply_draft',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    gmailMessageId: text('gmail_message_id').notNull(),
    inboundFrom: text('inbound_from'),
    inboundSubject: text('inbound_subject'),
    inboundPreview: text('inbound_preview').notNull(),
    draftSubject: text('draft_subject').notNull(),
    draftHtml: text('draft_html').notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    index('crm_contact_email_reply_draft_contact_pending').on(
      table.orgId,
      table.contactId,
      table.status,
    ),
  ],
);

export type ContactEmailReplyDraft = typeof contactEmailReplyDraft.$inferSelect;
