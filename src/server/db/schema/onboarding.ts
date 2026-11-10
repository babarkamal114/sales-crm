import {
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { crmSchema, organisation, user } from '@/server/db/schema/membership';

export const agreementKindEnum = crmSchema.enum('agreement_kind', [
  'terms',
  'dpa',
]);

export const accessRequestStatusEnum = crmSchema.enum('access_request_status', [
  'pending',
  'approved',
  'declined',
]);

export const organisationSettings = crmSchema.table(
  'organisation_settings',
  {
    orgId: uuid('org_id')
      .primaryKey()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    industry: text('industry'),
    teamSizeBand: text('team_size_band'),
    country: text('country').notNull().default('GB'),
    currency: text('currency').notNull().default('GBP'),
    timeZone: text('time_zone').notNull().default('Europe/London'),
    postalAddress: text('postal_address'),
    leadSources: text('lead_sources').array().notNull().default([]),
    contactChannels: text('contact_channels').array().notNull().default([]),
    autoLinkContactsByEmailDomain: boolean('auto_link_contacts_by_email_domain')
      .notNull()
      .default(true),
    collectContactDateOfBirth: boolean('collect_contact_date_of_birth')
      .notNull()
      .default(false),
    logoObjectKey: text('logo_object_key'),
    onboardingCompletedAt: timestamp('onboarding_completed_at', {
      withTimezone: true,
    }),
    onboardingCompletedBy: uuid('onboarding_completed_by').references(
      () => user.id,
      { onDelete: 'set null' },
    ),
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
);

export const onboardingProgress = crmSchema.table(
  'onboarding_progress',
  {
    orgId: uuid('org_id')
      .primaryKey()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    currentStep: text('current_step'),
    completedSteps: text('completed_steps').array().notNull().default([]),
    skippedSteps: text('skipped_steps').array().notNull().default([]),
    stepDrafts: jsonb('step_drafts').notNull().default({}),
    setupStartedByUserId: uuid('setup_started_by_user_id').references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => user.id),
  },
);

export const userProfile = crmSchema.table('user_profile', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  jobTitle: text('job_title'),
  phoneE164: text('phone_e164'),
  timeZone: text('time_zone'),
  notificationEmail: text('notification_email'),
  profileCompletedAt: timestamp('profile_completed_at', {
    withTimezone: true,
  }),
  tourCompletedAt: timestamp('tour_completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const agreementAcceptance = crmSchema.table(
  'agreement_acceptance',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    agreement: agreementKindEnum('agreement').notNull(),
    version: text('version').notNull(),
    acceptedBy: uuid('accepted_by')
      .notNull()
      .references(() => user.id),
    acceptedAt: timestamp('accepted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipHash: text('ip_hash').notNull(),
  },
  (table) => [
    uniqueIndex('crm_agreement_acceptance_org_agreement_version').on(
      table.orgId,
      table.agreement,
      table.version,
    ),
  ],
);

export const accessRequest = crmSchema.table(
  'access_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    requesterUserId: uuid('requester_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: accessRequestStatusEnum('status').notNull().default('pending'),
    handledBy: uuid('handled_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type OrganisationSettings = typeof organisationSettings.$inferSelect;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type UserProfile = typeof userProfile.$inferSelect;
