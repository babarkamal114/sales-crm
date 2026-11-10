import { index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { contact } from '@/server/db/schema/pipeline';
import { crmSchema, organisation } from '@/server/db/schema/membership';

export const contactOutreachSequence = crmSchema.table(
  'contact_outreach_sequence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    sequenceKey: text('sequence_key').notNull(),
    status: text('status').notNull().default('active'),
    currentStepIndex: integer('current_step_index').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    lastSentAt: timestamp('last_sent_at', { withTimezone: true }),
    nextDueAt: timestamp('next_due_at', { withTimezone: true }),
    scheduledStartAt: timestamp('scheduled_start_at', { withTimezone: true }),
    pauseReason: text('pause_reason'),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('crm_contact_outreach_sequence_org_due').on(table.orgId, table.nextDueAt),
  ],
);

export type ContactOutreachSequence = typeof contactOutreachSequence.$inferSelect;
