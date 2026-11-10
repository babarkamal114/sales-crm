import {
  bigint,
  boolean,
  date,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { crmSchema, organisation, user } from '@/server/db/schema/membership';

export const pipelineStageKindEnum = crmSchema.enum('pipeline_stage_kind', [
  'open',
  'won',
  'lost',
]);

export const opportunityValueTypeEnum = crmSchema.enum('opportunity_value_type', [
  'one_off',
  'recurring_monthly',
  'recurring_annual',
]);

export const opportunityPriorityEnum = crmSchema.enum('opportunity_priority', [
  'low',
  'normal',
  'high',
]);

export const opportunityStatusEnum = crmSchema.enum('opportunity_status', [
  'open',
  'won',
  'lost',
]);

export const recipientTypeEnum = crmSchema.enum('recipient_type', [
  'individual',
  'corporate',
]);

export const contactLifecycleEnum = crmSchema.enum('contact_lifecycle', [
  'lead',
  'customer',
  'former_customer',
  'not_a_fit',
]);

export const phoneTypeEnum = crmSchema.enum('phone_type', ['mobile', 'landline']);

export const pipeline = crmSchema.table(
  'pipeline',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    position: integer('position').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
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
  },
  (table) => [
    uniqueIndex('crm_pipeline_org_slug').on(table.orgId, table.slug),
    index('crm_pipeline_org_position').on(table.orgId, table.position),
  ],
);

export const pipelineStage = crmSchema.table(
  'pipeline_stage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    pipelineId: uuid('pipeline_id')
      .notNull()
      .references(() => pipeline.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: pipelineStageKindEnum('kind').notNull().default('open'),
    position: integer('position').notNull(),
    probability: integer('probability'),
    rottingDays: integer('rotting_days'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
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
  },
  (table) => [
    uniqueIndex('crm_pipeline_stage_pipeline_position').on(
      table.pipelineId,
      table.position,
    ),
    uniqueIndex('crm_pipeline_stage_pipeline_id').on(table.pipelineId, table.id),
    index('crm_pipeline_stage_org_pipeline').on(table.orgId, table.pipelineId),
  ],
);

export const contact = crmSchema.table(
  'contact',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull().default(''),
    email: text('email'),
    emailNormalised: text('email_normalised'),
    emailVerified: boolean('email_verified').notNull().default(false),
    phoneE164: text('phone_e164'),
    phoneType: phoneTypeEnum('phone_type'),
    jobTitle: text('job_title'),
    companyId: uuid('company_id'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id),
    recipientType: recipientTypeEnum('recipient_type').notNull().default('individual'),
    lifecycle: contactLifecycleEnum('lifecycle').notNull().default('lead'),
    socialUrl: text('social_url'),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    city: text('city'),
    postcode: text('postcode'),
    country: text('country').default('GB'),
    secondaryEmail: text('secondary_email'),
    secondaryEmailNormalised: text('secondary_email_normalised'),
    secondaryPhoneE164: text('secondary_phone_e164'),
    dateOfBirth: date('date_of_birth'),
    avatarKey: text('avatar_key'),
    source: text('source'),
    campaign: text('campaign'),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    nextTaskDueAt: timestamp('next_task_due_at', { withTimezone: true }),
    restricted: boolean('restricted').notNull().default(false),
    mergedIntoId: uuid('merged_into_id'),
    marketingConsent: boolean('marketing_consent').notNull().default(false),
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
    index('crm_contact_org_owner').on(table.orgId, table.ownerId),
    index('crm_contact_org_created').on(table.orgId, table.createdAt),
    index('crm_contact_org_last_activity').on(table.orgId, table.lastActivityAt),
    index('crm_contact_org_company').on(table.orgId, table.companyId),
  ],
);

export const opportunity = crmSchema.table(
  'opportunity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id'),
    pipelineId: uuid('pipeline_id')
      .notNull()
      .references(() => pipeline.id, { onDelete: 'restrict' }),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => pipelineStage.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    status: opportunityStatusEnum('status').notNull().default('open'),
    valuePence: bigint('value_pence', { mode: 'number' }),
    valueType: opportunityValueTypeEnum('value_type').notNull().default('one_off'),
    priority: opportunityPriorityEnum('priority').notNull().default('normal'),
    currency: text('currency').notNull().default('GBP'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id),
    expectedCloseDate: date('expected_close_date'),
    probabilityOverride: integer('probability_override'),
    position: text('position').notNull().default('n'),
    stageEnteredAt: timestamp('stage_entered_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    wonAt: timestamp('won_at', { withTimezone: true }),
    lostAt: timestamp('lost_at', { withTimezone: true }),
    lostReasonId: uuid('lost_reason_id'),
    lostNote: text('lost_note'),
    closedBy: uuid('closed_by').references(() => user.id),
    source: text('source'),
    campaign: text('campaign'),
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
    index('crm_opportunity_board_order').on(
      table.orgId,
      table.pipelineId,
      table.stageId,
      table.position,
      table.id,
    ),
    index('crm_opportunity_org_pipeline_status').on(
      table.orgId,
      table.pipelineId,
      table.status,
    ),
    index('crm_opportunity_org_owner_status').on(
      table.orgId,
      table.ownerId,
      table.status,
    ),
    index('crm_opportunity_org_contact').on(table.orgId, table.contactId),
    index('crm_opportunity_org_last_activity').on(table.orgId, table.lastActivityAt),
    index('crm_opportunity_org_name_trgm').on(table.orgId, table.name),
  ],
);

export type Pipeline = typeof pipeline.$inferSelect;
export type PipelineStage = typeof pipelineStage.$inferSelect;
export type Contact = typeof contact.$inferSelect;
export type Opportunity = typeof opportunity.$inferSelect;
