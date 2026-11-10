import {
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { crmSchema, organisation, user } from '@/server/db/schema/membership';
import { tag } from '@/server/db/schema/contacts-extended';
import {
  opportunity,
  pipeline,
  pipelineStage,
} from '@/server/db/schema/pipeline';

export const savedViewScopeEnum = crmSchema.enum('saved_view_scope', [
  'board',
  'list',
]);

export const pipelineMember = crmSchema.table(
  'pipeline_member',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    pipelineId: uuid('pipeline_id')
      .notNull()
      .references(() => pipeline.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    uniqueIndex('crm_pipeline_member_pipeline_user').on(
      table.pipelineId,
      table.userId,
    ),
    index('crm_pipeline_member_org_user').on(table.orgId, table.userId),
  ],
);

export const lostReason = crmSchema.table(
  'lost_reason',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull(),
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
    index('crm_lost_reason_org_position').on(table.orgId, table.position),
  ],
);

export const opportunityStageHistory = crmSchema.table(
  'opportunity_stage_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    opportunityId: uuid('opportunity_id')
      .notNull()
      .references(() => opportunity.id, { onDelete: 'cascade' }),
    fromStageId: uuid('from_stage_id').references(() => pipelineStage.id, {
      onDelete: 'set null',
    }),
    toStageId: uuid('to_stage_id')
      .notNull()
      .references(() => pipelineStage.id, { onDelete: 'restrict' }),
    movedBy: uuid('moved_by')
      .notNull()
      .references(() => user.id),
    movedAt: timestamp('moved_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    timeInPreviousStageSeconds: integer('time_in_previous_stage_seconds'),
  },
  (table) => [
    index('crm_opp_stage_history_opp_moved').on(
      table.opportunityId,
      table.movedAt,
    ),
  ],
);

export const opportunityFollower = crmSchema.table(
  'opportunity_follower',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    opportunityId: uuid('opportunity_id')
      .notNull()
      .references(() => opportunity.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    uniqueIndex('crm_opportunity_follower_opp_user').on(
      table.opportunityId,
      table.userId,
    ),
  ],
);

export const opportunityTag = crmSchema.table(
  'opportunity_tag',
  {
    opportunityId: uuid('opportunity_id')
      .notNull()
      .references(() => opportunity.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.opportunityId, table.tagId] })],
);

export const savedView = crmSchema.table(
  'saved_view',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organisation.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    ownerId: uuid('owner_id').references(() => user.id, { onDelete: 'cascade' }),
    scope: savedViewScopeEnum('scope').notNull(),
    pipelineId: uuid('pipeline_id').references(() => pipeline.id, {
      onDelete: 'cascade',
    }),
    filters: jsonb('filters').notNull().default({}),
    sort: jsonb('sort').notNull().default({}),
    columns: jsonb('columns').notNull().default([]),
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
    index('crm_saved_view_org_scope').on(table.orgId, table.scope),
    index('crm_saved_view_org_pipeline').on(table.orgId, table.pipelineId),
  ],
);

export type PipelineMember = typeof pipelineMember.$inferSelect;
export type LostReason = typeof lostReason.$inferSelect;
export type OpportunityStageHistory = typeof opportunityStageHistory.$inferSelect;
export type OpportunityFollower = typeof opportunityFollower.$inferSelect;
export type SavedView = typeof savedView.$inferSelect;
