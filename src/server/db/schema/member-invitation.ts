import { text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { crmRoleEnum, crmSchema, organisation, user } from '@/server/db/schema/membership';

export const memberInvitationStatusEnum = crmSchema.enum(
  'member_invitation_status',
  ['pending', 'accepted', 'revoked', 'expired'],
);

export const memberInvitation = crmSchema.table('member_invitation', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: crmRoleEnum('role').notNull().default('member'),
  status: memberInvitationStatusEnum('status').notNull().default('pending'),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => user.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MemberInvitation = typeof memberInvitation.$inferSelect;
