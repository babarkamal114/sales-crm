import { jsonb, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { crmSchema, organisation, user } from '@/server/db/schema/membership';

export const integrationStatusEnum = crmSchema.enum('integration_status', [
  'disconnected',
  'pending',
  'connected',
  'error',
]);

export const integrationConnection = crmSchema.table(
  'integration_connection',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    capability: text('capability').notNull(),
    status: integrationStatusEnum('status').notNull().default('disconnected'),
    externalAccountId: text('external_account_id'),
    metadata: jsonb('metadata').notNull().default({}),
    connectedBy: uuid('connected_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    connectedAt: timestamp('connected_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('crm_integration_connection_org_provider').on(
      table.orgId,
      table.provider,
    ),
  ],
);

export type IntegrationConnection = typeof integrationConnection.$inferSelect;
