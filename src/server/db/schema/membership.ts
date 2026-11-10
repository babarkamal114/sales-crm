import {
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const crmSchema = pgSchema('crm');

export const crmRoleEnum = crmSchema.enum('crm_role', [
  'admin',
  'manager',
  'member',
]);

export const memberStatusEnum = crmSchema.enum('member_status', [
  'active',
  'pending',
  'suspended',
]);

export const organisation = crmSchema.table('organisation', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const user = crmSchema.table(
  'user',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    googleSub: text('google_sub'),
    microsoftSub: text('microsoft_sub'),
    fullName: text('full_name').notNull(),
    status: memberStatusEnum('status').notNull().default('active'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('crm_user_email_unique').on(table.email),
    uniqueIndex('crm_user_google_sub_unique').on(table.googleSub),
    uniqueIndex('crm_user_microsoft_sub_unique').on(table.microsoftSub),
  ],
);

export const session = crmSchema.table('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const membership = crmSchema.table(
  'membership',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: crmRoleEnum('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('crm_membership_org_user_unique').on(table.orgId, table.userId),
  ],
);

export type Organisation = typeof organisation.$inferSelect;
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Membership = typeof membership.$inferSelect;
export type CrmRole = (typeof crmRoleEnum.enumValues)[number];
