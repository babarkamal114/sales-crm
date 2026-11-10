import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { crmSchema, organisation, user } from '@/server/db/schema/membership';

export const channelKindEnum = crmSchema.enum('channel_kind', ['sms', 'voice', 'whatsapp']);
export const channelModeEnum = crmSchema.enum('channel_mode', ['managed', 'byo']);
export const channelProviderEnum = crmSchema.enum('channel_provider', [
  'twilio',
  'meta',
  'vonage',
  'telnyx',
]);
export const channelConnectionStatusEnum = crmSchema.enum('channel_connection_status', [
  'draft',
  'pending',
  'verifying',
  'active',
  'degraded',
  'failed',
  'suspended',
  'disconnected',
]);

export const mailboxKindEnum = crmSchema.enum('mailbox_kind', ['personal', 'shared']);
export const mailboxProviderEnum = crmSchema.enum('mailbox_provider', [
  'google',
  'microsoft',
  'imap',
]);
export const mailboxStatusEnum = crmSchema.enum('mailbox_status', [
  'connecting',
  'syncing_initial',
  'active',
  'degraded',
  'reconnect_required',
  'disconnected',
]);
export const mailboxSyncModeEnum = crmSchema.enum('mailbox_sync_mode', ['push', 'poll']);

export const channelConnection = crmSchema.table(
  'channel_connection',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    channel: channelKindEnum('channel').notNull(),
    mode: channelModeEnum('mode').notNull().default('managed'),
    provider: channelProviderEnum('provider').notNull(),
    status: channelConnectionStatusEnum('status').notNull().default('draft'),
    statusReason: text('status_reason'),
    providerIds: jsonb('provider_ids').notNull().default({}),
    credentialsCiphertext: text('credentials_ciphertext'),
    credentialsKeyId: text('credentials_key_id'),
    credentialsLast4: text('credentials_last4'),
    webhookSecretCiphertext: text('webhook_secret_ciphertext'),
    isDefault: boolean('is_default').notNull().default(false),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    connectedBy: uuid('connected_by').references(() => user.id, { onDelete: 'set null' }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => user.id),
  },
  (t) => [
    index('crm_channel_connection_org').on(t.orgId, t.channel, t.status),
    uniqueIndex('crm_channel_connection_default')
      .on(t.orgId, t.channel)
      .where(sql`is_default = true`),
  ],
);

export const mailboxConnection = crmSchema.table(
  'mailbox_connection',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: mailboxKindEnum('kind').notNull().default('personal'),
    provider: mailboxProviderEnum('provider').notNull(),
    emailAddress: text('email_address').notNull(),
    displayName: text('display_name'),
    scopes: text('scopes').array(),
    accessTokenCiphertext: text('access_token_ciphertext'),
    refreshTokenCiphertext: text('refresh_token_ciphertext'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    imapSettings: jsonb('imap_settings'),
    status: mailboxStatusEnum('status').notNull().default('connecting'),
    statusReason: text('status_reason'),
    syncMode: mailboxSyncModeEnum('sync_mode').notNull().default('push'),
    dailySendLimit: integer('daily_send_limit').notNull().default(400),
    sentToday: integer('sent_today').notNull().default(0),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    connectedAt: timestamp('connected_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => user.id),
  },
  (t) => [
    index('crm_mailbox_connection_org_user').on(t.orgId, t.userId),
    uniqueIndex('crm_mailbox_personal_user').on(t.orgId, t.userId).where(sql`kind = 'personal'`),
  ],
);

export const mailboxSyncState = crmSchema.table('mailbox_sync_state', {
  mailboxId: uuid('mailbox_id')
    .primaryKey()
    .references(() => mailboxConnection.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull(),
  gmailHistoryId: text('gmail_history_id'),
  gmailWatchExpiresAt: timestamp('gmail_watch_expires_at', { withTimezone: true }),
  graphDeltaLink: text('graph_delta_link'),
  graphSubscriptionId: text('graph_subscription_id'),
  graphSubscriptionExpiresAt: timestamp('graph_subscription_expires_at', { withTimezone: true }),
  imapUidvalidity: text('imap_uidvalidity'),
  imapLastUid: text('imap_last_uid'),
  backfillFrom: timestamp('backfill_from', { withTimezone: true }),
  backfillStatus: text('backfill_status'),
});

export const phoneNumber = crmSchema.table(
  'phone_number',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => channelConnection.id, { onDelete: 'cascade' }),
    e164: text('e164').notNull(),
    type: text('type').notNull(),
    capabilities: jsonb('capabilities').notNull().default({ voice: true, sms: false }),
    source: text('source').notNull().default('purchased'),
    providerSid: text('provider_sid'),
    assignedUserId: uuid('assigned_user_id').references(() => user.id, { onDelete: 'set null' }),
    isDefaultForSms: boolean('is_default_for_sms').notNull().default(false),
    isDefaultForVoice: boolean('is_default_for_voice').notNull().default(false),
    status: text('status').notNull().default('active'),
    monthlyCostPence: integer('monthly_cost_pence'),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }),
    releaseAt: timestamp('release_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('crm_phone_number_org_e164').on(t.orgId, t.e164)],
);

export const regulatoryProfile = crmSchema.table('regulatory_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  legalName: text('legal_name').notNull(),
  companyNumber: text('company_number'),
  address: jsonb('address').notNull().default({}),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  providerBundleSid: text('provider_bundle_sid'),
  providerEndUserSid: text('provider_end_user_sid'),
  status: text('status').notNull().default('draft'),
  rejectionReason: text('rejection_reason'),
  documents: jsonb('documents').notNull().default([]),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usageRecord = crmSchema.table(
  'usage_record',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    connectionId: uuid('connection_id').references(() => channelConnection.id, {
      onDelete: 'set null',
    }),
    channel: channelKindEnum('channel').notNull(),
    unit: text('unit').notNull(),
    quantity: integer('quantity').notNull(),
    costPence: bigint('cost_pence', { mode: 'number' }),
    pricePence: bigint('price_pence', { mode: 'number' }),
    direction: text('direction'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    providerReference: text('provider_reference').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('crm_usage_record_provider_ref').on(t.providerReference)],
);

export const spendLimit = crmSchema.table('spend_limit', {
  orgId: uuid('org_id')
    .primaryKey()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  monthlyLimitPence: bigint('monthly_limit_pence', { mode: 'number' }).notNull(),
  alertAtPercent: integer('alert_at_percent').notNull().default(80),
  pauseAtPercent: integer('pause_at_percent').notNull().default(100),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const channelEvent = crmSchema.table(
  'channel_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => channelConnection.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    detail: jsonb('detail').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
  },
  (t) => [index('crm_channel_event_connection').on(t.connectionId, t.createdAt)],
);

export const mailboxSharedAccess = crmSchema.table(
  'mailbox_shared_access',
  {
    mailboxId: uuid('mailbox_id')
      .notNull()
      .references(() => mailboxConnection.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull(),
    userId: uuid('user_id'),
    teamId: uuid('team_id'),
    canSend: boolean('can_send').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('crm_mailbox_shared_access_user')
      .on(t.mailboxId, t.userId)
      .where(sql`${t.userId} IS NOT NULL`),
  ],
);

export const mailboxExclusion = crmSchema.table(
  'mailbox_exclusion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    mailboxId: uuid('mailbox_id').references(() => mailboxConnection.id, {
      onDelete: 'cascade',
    }),
    pattern: text('pattern').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
  },
  (t) => [index('crm_mailbox_exclusion_org').on(t.orgId)],
);

export const alphaSender = crmSchema.table(
  'alpha_sender',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('crm_alpha_sender_org_name').on(t.orgId, t.name)],
);

export const verifiedCallerId = crmSchema.table(
  'verified_caller_id',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    e164: text('e164').notNull(),
    providerSid: text('provider_sid'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('crm_verified_caller_id_org_e164').on(t.orgId, t.e164)],
);

export const portRequest = crmSchema.table(
  'port_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    numbers: jsonb('numbers').notNull().default([]),
    currentProvider: text('current_provider'),
    accountReference: text('account_reference'),
    authorisedName: text('authorised_name'),
    billDocumentKey: text('bill_document_key'),
    targetDate: date('target_date'),
    status: text('status').notNull().default('draft'),
    providerReference: text('provider_reference'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('crm_port_request_org').on(t.orgId, t.status)],
);

export const whatsappSender = crmSchema.table('whatsapp_sender', {
  connectionId: uuid('connection_id')
    .primaryKey()
    .references(() => channelConnection.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull(),
  wabaId: text('waba_id').notNull(),
  phoneNumberId: text('phone_number_id').notNull(),
  displayName: text('display_name'),
  displayNameStatus: text('display_name_status'),
  qualityRating: text('quality_rating'),
  messagingLimitTier: text('messaging_limit_tier'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ChannelConnection = typeof channelConnection.$inferSelect;
export type MailboxConnection = typeof mailboxConnection.$inferSelect;
