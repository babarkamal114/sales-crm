import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { contact } from '@/server/db/schema/pipeline';
import { crmSchema, organisation, user } from '@/server/db/schema/membership';

export const orgUserNotification = crmSchema.table(
  'org_user_notification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    href: text('href'),
    contactId: uuid('contact_id').references(() => contact.id, { onDelete: 'set null' }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('crm_org_user_notification_user_unread').on(table.orgId, table.userId, table.createdAt),
  ],
);

export type OrgUserNotification = typeof orgUserNotification.$inferSelect;
