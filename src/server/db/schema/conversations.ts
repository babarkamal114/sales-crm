import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditActorTypeEnum } from '@/server/db/schema/audit';
import { contact } from '@/server/db/schema/pipeline';
import { crmSchema, organisation, user } from '@/server/db/schema/membership';

export const conversationStatusEnum = crmSchema.enum('conversation_status', [
  'open',
  'snoozed',
  'closed',
]);

export const messageChannelEnum = crmSchema.enum('message_channel', [
  'email',
  'sms',
  'whatsapp',
]);

export const messageDirectionEnum = crmSchema.enum('message_direction', [
  'inbound',
  'outbound',
]);

export const messagePurposeEnum = crmSchema.enum('message_purpose', [
  'conversation',
  'marketing',
]);

export const messageStatusEnum = crmSchema.enum('message_status', [
  'scheduled',
  'queued',
  'sending',
  'sent',
  'delivered',
  'read',
  'failed',
  'bounced',
]);

export const attachmentScanStatusEnum = crmSchema.enum('attachment_scan_status', [
  'pending',
  'clean',
  'blocked',
]);

export const whatsappTemplateStatusEnum = crmSchema.enum('whatsapp_template_status', [
  'pending',
  'approved',
  'rejected',
]);

export const phoneCallDirectionEnum = crmSchema.enum('phone_call_direction', [
  'inbound',
  'outbound',
]);

export const phoneCallStatusEnum = crmSchema.enum('phone_call_status', [
  'ringing',
  'in_progress',
  'completed',
  'missed',
  'failed',
]);

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const conversation = crmSchema.table(
  'conversation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    status: conversationStatusEnum('status').notNull().default('open'),
    assigneeId: uuid('assignee_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
    lastOutboundAt: timestamp('last_outbound_at', { withTimezone: true }),
    waitingSince: timestamp('waiting_since', { withTimezone: true }),
    lastChannel: messageChannelEnum('last_channel'),
    waWindowExpiresAt: timestamp('wa_window_expires_at', { withTimezone: true }),
    replyToken: text('reply_token').notNull(),
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
  (table) => [
    uniqueIndex('crm_conversation_org_contact').on(table.orgId, table.contactId),
    uniqueIndex('crm_conversation_reply_token').on(table.replyToken),
    index('crm_conversation_inbox').on(
      table.orgId,
      table.status,
      table.assigneeId,
      table.lastMessageAt,
      table.id,
    ),
    index('crm_conversation_waiting').on(table.orgId, table.status, table.waitingSince),
  ],
);

export const message = crmSchema.table(
  'message',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    channel: messageChannelEnum('channel').notNull(),
    direction: messageDirectionEnum('direction').notNull(),
    purpose: messagePurposeEnum('purpose').notNull().default('conversation'),
    subject: text('subject'),
    bodyText: text('body_text'),
    bodyHtml: text('body_html'),
    preview: text('preview'),
    fromAddress: text('from_address'),
    toAddress: text('to_address'),
    cc: text('cc').array(),
    provider: text('provider'),
    providerMessageId: text('provider_message_id'),
    status: messageStatusEnum('status').notNull().default('queued'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    sentByUserId: uuid('sent_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    templateId: uuid('template_id'),
    clientId: uuid('client_id'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    segments: integer('segments'),
    emailMessageId: text('email_message_id'),
    inReplyTo: text('in_reply_to'),
    references: text('references').array(),
    searchVector: tsvector('search_vector'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('crm_message_conversation_timeline').on(
      table.conversationId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const messageStatusEvent = crmSchema.table(
  'message_status_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => message.id, { onDelete: 'cascade' }),
    status: messageStatusEnum('status').notNull(),
    providerPayloadHash: text('provider_payload_hash'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('crm_message_status_event_message').on(table.messageId, table.occurredAt)],
);

export const messageAttachment = crmSchema.table('message_attachment', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id')
    .notNull()
    .references(() => message.id, { onDelete: 'cascade' }),
  r2Key: text('r2_key').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  scanStatus: attachmentScanStatusEnum('scan_status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conversationComment = crmSchema.table('conversation_comment', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversation.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => user.id),
  body: text('body').notNull(),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const commentMention = crmSchema.table(
  'comment_mention',
  {
    commentId: uuid('comment_id')
      .notNull()
      .references(() => conversationComment.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.commentId, table.userId] })],
);

export const conversationRead = crmSchema.table(
  'conversation_read',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index('crm_conversation_read_user').on(table.userId, table.conversationId),
  ],
);

export const messageTemplate = crmSchema.table('message_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  channel: messageChannelEnum('channel').notNull(),
  name: text('name').notNull(),
  body: text('body').notNull(),
  subject: text('subject'),
  category: text('category'),
  whatsappTemplateName: text('whatsapp_template_name'),
  whatsappStatus: whatsappTemplateStatusEnum('whatsapp_status'),
  language: text('language').notNull().default('en_GB'),
  active: boolean('active').notNull().default(true),
});

export const snippet = crmSchema.table('snippet', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organisation.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').references(() => user.id, { onDelete: 'cascade' }),
  shortcut: text('shortcut').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const phoneCall = crmSchema.table(
  'phone_call',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => conversation.id, {
      onDelete: 'set null',
    }),
    direction: phoneCallDirectionEnum('direction').notNull(),
    status: phoneCallStatusEnum('status').notNull(),
    durationSeconds: integer('duration_seconds'),
    recordingR2Key: text('recording_r2_key'),
    provider: text('provider'),
    providerCallId: text('provider_call_id'),
    handledByUserId: uuid('handled_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('crm_phone_call_conversation').on(table.conversationId, table.createdAt)],
);

export const activityEvent = crmSchema.table(
  'activity_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    opportunityId: uuid('opportunity_id'),
    conversationId: uuid('conversation_id').references(() => conversation.id, {
      onDelete: 'set null',
    }),
    messageId: uuid('message_id').references(() => message.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    actorType: auditActorTypeEnum('actor_type').notNull(),
    actorId: text('actor_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    payload: jsonb('payload').notNull().default({}),
  },
  (table) => [
    index('crm_activity_event_contact').on(
      table.orgId,
      table.contactId,
      table.occurredAt,
      table.id,
    ),
  ],
);

export type Conversation = typeof conversation.$inferSelect;
export type Message = typeof message.$inferSelect;
export type MessageTemplate = typeof messageTemplate.$inferSelect;
export type ActivityEvent = typeof activityEvent.$inferSelect;
