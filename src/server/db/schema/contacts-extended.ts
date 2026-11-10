import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { contact } from '@/server/db/schema/pipeline';
import { crmSchema, organisation, user } from '@/server/db/schema/membership';

export const consentChannelEnum = crmSchema.enum('consent_channel', [
  'email',
  'sms',
  'whatsapp',
  'call',
]);

export const marketingConsentStateEnum = crmSchema.enum('marketing_consent_state', [
  'granted',
  'denied',
  'unknown',
]);

export const attributionTouchEnum = crmSchema.enum('attribution_touch', ['first', 'latest']);

export const companyLifecycleEnum = crmSchema.enum('company_lifecycle', [
  'prospect',
  'customer',
  'former_customer',
  'not_a_fit',
]);

export const companyLifecycleSourceEnum = crmSchema.enum('company_lifecycle_source', [
  'derived',
  'manual',
]);

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const company = crmSchema.table(
  'company',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nameNormalised: text('name_normalised'),
    domain: text('domain'),
    domainNormalised: text('domain_normalised'),
    websiteUrl: text('website_url'),
    phoneE164: text('phone_e164'),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    city: text('city'),
    postcode: text('postcode'),
    country: text('country').notNull().default('GB'),
    sizeBand: text('size_band'),
    industry: text('industry'),
    companiesHouseNumber: text('companies_house_number'),
    description: text('description'),
    linkedinUrl: text('linkedin_url'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id),
    lifecycle: companyLifecycleEnum('lifecycle').notNull().default('prospect'),
    lifecycleSource: companyLifecycleSourceEnum('lifecycle_source')
      .notNull()
      .default('derived'),
    parentCompanyId: uuid('parent_company_id'),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    nextTaskDueAt: timestamp('next_task_due_at', { withTimezone: true }),
    mergedIntoId: uuid('merged_into_id'),
    recipientType: text('recipient_type').notNull().default('corporate'),
    searchVector: tsvector('search_vector'),
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
    index('crm_company_org_owner').on(table.orgId, table.ownerId),
    index('crm_company_org_lifecycle').on(table.orgId, table.lifecycle),
    index('crm_company_org_last_activity').on(table.orgId, table.lastActivityAt, table.id),
    index('crm_company_org_created').on(table.orgId, table.createdAt, table.id),
  ],
);

export const companyDomain = crmSchema.table(
  'company_domain',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id, { onDelete: 'cascade' }),
    domainNormalised: text('domain_normalised').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
  },
  (table) => [index('crm_company_domain_org_company').on(table.orgId, table.companyId)],
);

export const companyFollower = crmSchema.table(
  'company_follower',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
  },
  (table) => [index('crm_company_follower_org_company').on(table.orgId, table.companyId)],
);

export const companyTag = crmSchema.table(
  'company_tag',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.companyId, table.tagId] })],
);

export const companyStats = crmSchema.table(
  'company_stats',
  {
    companyId: uuid('company_id')
      .primaryKey()
      .references(() => company.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    openDealCount: integer('open_deal_count').notNull().default(0),
    openPipelineValue: bigint('open_pipeline_value', { mode: 'number' }).notNull().default(0),
    wonValueTotal: bigint('won_value_total', { mode: 'number' }).notNull().default(0),
    contactCount: integer('contact_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('crm_company_stats_org_pipeline').on(table.orgId, table.openPipelineValue)],
);

export const companyMergeLog = crmSchema.table('company_merge_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  survivingId: uuid('surviving_id')
    .notNull()
    .references(() => company.id),
  mergedId: uuid('merged_id')
    .notNull()
    .references(() => company.id),
  fieldChoices: jsonb('field_choices').notNull(),
  mergedBy: uuid('merged_by')
    .notNull()
    .references(() => user.id),
  mergedAt: timestamp('merged_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dismissedDuplicate = crmSchema.table(
  'dismissed_duplicate',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(),
    idA: uuid('id_a').notNull(),
    idB: uuid('id_b').notNull(),
    dismissedBy: uuid('dismissed_by')
      .notNull()
      .references(() => user.id),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('crm_dismissed_duplicate_org_entity').on(table.orgId, table.entityType),
  ],
);

export const contactCompany = crmSchema.table(
  'contact_company',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').notNull().default(false),
    role: text('role'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('crm_contact_company_org_company').on(table.orgId, table.companyId),
    index('crm_contact_company_org_contact').on(table.orgId, table.contactId),
  ],
);

export const tag = crmSchema.table('tag', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  colourKey: text('colour_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => user.id),
});

export const contactTag = crmSchema.table(
  'contact_tag',
  {
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.contactId, table.tagId] })],
);

export const contactConsent = crmSchema.table(
  'contact_consent',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    channel: consentChannelEnum('channel').notNull(),
    dnd: boolean('dnd').notNull().default(false),
    marketingConsent: marketingConsentStateEnum('marketing_consent')
      .notNull()
      .default('unknown'),
    source: text('source'),
    wording: text('wording'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    index('crm_contact_consent_org_contact').on(table.orgId, table.contactId),
  ],
);

export const attribution = crmSchema.table(
  'attribution',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    touch: attributionTouchEnum('touch').notNull(),
    source: text('source'),
    medium: text('medium'),
    campaign: text('campaign'),
    adSet: text('ad_set'),
    ad: text('ad'),
    form: text('form'),
    pageUrl: text('page_url'),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('crm_attribution_org_contact').on(table.orgId, table.contactId),
  ],
);

export const suppression = crmSchema.table('suppression', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  emailHash: text('email_hash'),
  phoneHash: text('phone_hash'),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const smartList = crmSchema.table('smart_list', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull().default('contact'),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').references(() => user.id),
  filters: jsonb('filters').notNull().default({}),
  sort: jsonb('sort').notNull().default({}),
  columns: jsonb('columns').notNull().default([]),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by')
    .notNull()
    .references(() => user.id),
});

export const contactFollower = crmSchema.table(
  'contact_follower',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
  },
  (table) => [index('crm_contact_follower_contact').on(table.orgId, table.contactId)],
);

export const contactConsentHistory = crmSchema.table(
  'contact_consent_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    channel: consentChannelEnum('channel').notNull(),
    dnd: boolean('dnd').notNull(),
    marketingConsent: marketingConsentStateEnum('marketing_consent').notNull(),
    reason: text('reason'),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
    changedBy: uuid('changed_by')
      .notNull()
      .references(() => user.id),
  },
);

export const contactMergeLog = crmSchema.table('contact_merge_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  survivingId: uuid('surviving_id')
    .notNull()
    .references(() => contact.id),
  mergedId: uuid('merged_id')
    .notNull()
    .references(() => contact.id),
  fieldChoices: jsonb('field_choices').notNull(),
  mergedBy: uuid('merged_by')
    .notNull()
    .references(() => user.id),
  mergedAt: timestamp('merged_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Company = typeof company.$inferSelect;
export type Tag = typeof tag.$inferSelect;
export type ContactConsent = typeof contactConsent.$inferSelect;
export type ContactFollower = typeof contactFollower.$inferSelect;
