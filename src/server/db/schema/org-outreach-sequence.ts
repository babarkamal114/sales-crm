import { index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { crmSchema, organisation } from '@/server/db/schema/membership';

export const orgOutreachSequence = crmSchema.table(
  'org_outreach_sequence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    sequenceKey: text('sequence_key').notNull(),
    label: text('label').notNull(),
    steps: jsonb('steps').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('crm_org_outreach_sequence_org_key').on(table.orgId, table.sequenceKey)],
);

export type OrgOutreachSequence = typeof orgOutreachSequence.$inferSelect;
