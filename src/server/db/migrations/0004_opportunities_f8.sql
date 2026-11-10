CREATE TYPE "crm"."saved_view_scope" AS ENUM('board', 'list');

-- Pipeline extensions
ALTER TABLE "crm"."pipeline"
  ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;

CREATE INDEX IF NOT EXISTS "crm_pipeline_org_position"
  ON "crm"."pipeline" ("org_id", "position");

-- Stage extensions (rename win_likelihood -> probability)
ALTER TABLE "crm"."pipeline_stage"
  RENAME COLUMN "win_likelihood" TO "probability";

ALTER TABLE "crm"."pipeline_stage"
  ADD COLUMN IF NOT EXISTS "rotting_days" integer,
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "created_by" uuid,
  ADD COLUMN IF NOT EXISTS "updated_by" uuid;

UPDATE "crm"."pipeline_stage" ps
SET
  "created_by" = p."created_by",
  "updated_by" = p."updated_by"
FROM "crm"."pipeline" p
WHERE ps."pipeline_id" = p."id"
  AND ps."created_by" IS NULL;

ALTER TABLE "crm"."pipeline_stage"
  ALTER COLUMN "created_by" SET NOT NULL,
  ALTER COLUMN "updated_by" SET NOT NULL;

ALTER TABLE "crm"."pipeline_stage"
  ADD CONSTRAINT "pipeline_stage_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "crm"."pipeline_stage"
  ADD CONSTRAINT "pipeline_stage_updated_by_user_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "crm_pipeline_stage_pipeline_id"
  ON "crm"."pipeline_stage" ("pipeline_id", "id");

CREATE INDEX IF NOT EXISTS "crm_pipeline_stage_org_pipeline"
  ON "crm"."pipeline_stage" ("org_id", "pipeline_id");

-- Opportunity: rename title -> name and extend
ALTER TABLE "crm"."opportunity"
  RENAME COLUMN "title" TO "name";

ALTER TABLE "crm"."opportunity"
  ADD COLUMN IF NOT EXISTS "company_id" uuid,
  ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'GBP' NOT NULL,
  ADD COLUMN IF NOT EXISTS "expected_close_date" date,
  ADD COLUMN IF NOT EXISTS "probability_override" integer,
  ADD COLUMN IF NOT EXISTS "position" text DEFAULT 'n' NOT NULL,
  ADD COLUMN IF NOT EXISTS "stage_entered_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "won_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "lost_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "lost_reason_id" uuid,
  ADD COLUMN IF NOT EXISTS "lost_note" text,
  ADD COLUMN IF NOT EXISTS "closed_by" uuid,
  ADD COLUMN IF NOT EXISTS "source" text,
  ADD COLUMN IF NOT EXISTS "campaign" text,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

UPDATE "crm"."opportunity"
SET
  "stage_entered_at" = COALESCE("stage_entered_at", "created_at"),
  "last_activity_at" = COALESCE("last_activity_at", "created_at")
WHERE "stage_entered_at" IS NULL OR "last_activity_at" IS NULL;

ALTER TABLE "crm"."opportunity"
  ALTER COLUMN "stage_entered_at" SET NOT NULL,
  ALTER COLUMN "stage_entered_at" SET DEFAULT now();

ALTER TABLE "crm"."opportunity"
  ALTER COLUMN "value_pence" TYPE bigint USING "value_pence"::bigint;

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_closed_by_user_id_fk"
  FOREIGN KEY ("closed_by") REFERENCES "crm"."user"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_pipeline_stage_fk"
  FOREIGN KEY ("pipeline_id", "stage_id")
  REFERENCES "crm"."pipeline_stage" ("pipeline_id", "id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_value_pence_nonneg"
  CHECK ("value_pence" IS NULL OR "value_pence" >= 0);

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_probability_override_range"
  CHECK (
    "probability_override" IS NULL
    OR ("probability_override" >= 0 AND "probability_override" <= 100)
  );

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_lost_requires_reason"
  CHECK ("status" <> 'lost' OR "lost_reason_id" IS NOT NULL);

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_won_requires_won_at"
  CHECK ("status" <> 'won' OR "won_at" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "crm_opportunity_board_order"
  ON "crm"."opportunity" ("org_id", "pipeline_id", "stage_id", "position", "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "crm_opportunity_org_pipeline_status"
  ON "crm"."opportunity" ("org_id", "pipeline_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "crm_opportunity_org_owner_status"
  ON "crm"."opportunity" ("org_id", "owner_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "crm_opportunity_org_contact"
  ON "crm"."opportunity" ("org_id", "contact_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "crm_opportunity_org_expected_close_open"
  ON "crm"."opportunity" ("org_id", "expected_close_date")
  WHERE "deleted_at" IS NULL AND "status" = 'open';

CREATE INDEX IF NOT EXISTS "crm_opportunity_org_last_activity"
  ON "crm"."opportunity" ("org_id", "last_activity_at")
  WHERE "deleted_at" IS NULL;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "crm_opportunity_name_trgm"
  ON "crm"."opportunity"
  USING gin ("name" gin_trgm_ops);

-- Pipeline membership (rule 21)
CREATE TABLE "crm"."pipeline_member" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "pipeline_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL
);

ALTER TABLE "crm"."pipeline_member"
  ADD CONSTRAINT "pipeline_member_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."pipeline_member"
  ADD CONSTRAINT "pipeline_member_pipeline_id_pipeline_id_fk"
  FOREIGN KEY ("pipeline_id") REFERENCES "crm"."pipeline"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."pipeline_member"
  ADD CONSTRAINT "pipeline_member_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "crm"."user"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."pipeline_member"
  ADD CONSTRAINT "pipeline_member_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX "crm_pipeline_member_pipeline_user"
  ON "crm"."pipeline_member" ("pipeline_id", "user_id");

CREATE INDEX "crm_pipeline_member_org_user"
  ON "crm"."pipeline_member" ("org_id", "user_id");

-- Lost reasons
CREATE TABLE "crm"."lost_reason" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "name" text NOT NULL,
  "position" integer NOT NULL,
  "archived_at" timestamp with time zone,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

ALTER TABLE "crm"."lost_reason"
  ADD CONSTRAINT "lost_reason_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."lost_reason"
  ADD CONSTRAINT "lost_reason_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "crm"."lost_reason"
  ADD CONSTRAINT "lost_reason_updated_by_user_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

CREATE INDEX "crm_lost_reason_org_position"
  ON "crm"."lost_reason" ("org_id", "position");

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_lost_reason_id_lost_reason_id_fk"
  FOREIGN KEY ("lost_reason_id") REFERENCES "crm"."lost_reason"("id")
  ON DELETE restrict ON UPDATE no action;

-- Stage history (append-only)
CREATE TABLE "crm"."opportunity_stage_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "opportunity_id" uuid NOT NULL,
  "from_stage_id" uuid,
  "to_stage_id" uuid NOT NULL,
  "moved_by" uuid NOT NULL,
  "moved_at" timestamp with time zone DEFAULT now() NOT NULL,
  "time_in_previous_stage_seconds" integer
);

ALTER TABLE "crm"."opportunity_stage_history"
  ADD CONSTRAINT "opportunity_stage_history_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity_stage_history"
  ADD CONSTRAINT "opportunity_stage_history_opportunity_id_opportunity_id_fk"
  FOREIGN KEY ("opportunity_id") REFERENCES "crm"."opportunity"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity_stage_history"
  ADD CONSTRAINT "opportunity_stage_history_from_stage_id_pipeline_stage_id_fk"
  FOREIGN KEY ("from_stage_id") REFERENCES "crm"."pipeline_stage"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "crm"."opportunity_stage_history"
  ADD CONSTRAINT "opportunity_stage_history_to_stage_id_pipeline_stage_id_fk"
  FOREIGN KEY ("to_stage_id") REFERENCES "crm"."pipeline_stage"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "crm"."opportunity_stage_history"
  ADD CONSTRAINT "opportunity_stage_history_moved_by_user_id_fk"
  FOREIGN KEY ("moved_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

CREATE INDEX "crm_opp_stage_history_opp_moved"
  ON "crm"."opportunity_stage_history" ("opportunity_id", "moved_at");

-- Followers
CREATE TABLE "crm"."opportunity_follower" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "opportunity_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL
);

ALTER TABLE "crm"."opportunity_follower"
  ADD CONSTRAINT "opportunity_follower_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity_follower"
  ADD CONSTRAINT "opportunity_follower_opportunity_id_opportunity_id_fk"
  FOREIGN KEY ("opportunity_id") REFERENCES "crm"."opportunity"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity_follower"
  ADD CONSTRAINT "opportunity_follower_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "crm"."user"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity_follower"
  ADD CONSTRAINT "opportunity_follower_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX "crm_opportunity_follower_opp_user"
  ON "crm"."opportunity_follower" ("opportunity_id", "user_id");

-- Saved views
CREATE TABLE "crm"."saved_view" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "name" text NOT NULL,
  "owner_id" uuid,
  "scope" "crm"."saved_view_scope" NOT NULL,
  "pipeline_id" uuid,
  "filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "sort" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

ALTER TABLE "crm"."saved_view"
  ADD CONSTRAINT "saved_view_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."saved_view"
  ADD CONSTRAINT "saved_view_owner_id_user_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "crm"."user"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."saved_view"
  ADD CONSTRAINT "saved_view_pipeline_id_pipeline_id_fk"
  FOREIGN KEY ("pipeline_id") REFERENCES "crm"."pipeline"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."saved_view"
  ADD CONSTRAINT "saved_view_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "crm"."saved_view"
  ADD CONSTRAINT "saved_view_updated_by_user_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

CREATE INDEX "crm_saved_view_org_scope"
  ON "crm"."saved_view" ("org_id", "scope");

CREATE INDEX "crm_saved_view_org_pipeline"
  ON "crm"."saved_view" ("org_id", "pipeline_id");

-- Seed lost reasons and pipeline members for existing organisations
INSERT INTO "crm"."lost_reason" (
  "org_id", "name", "position", "created_by", "updated_by"
)
SELECT
  o."id",
  seed."name",
  seed."position",
  COALESCE(
    (SELECT m."user_id" FROM "crm"."membership" m WHERE m."org_id" = o."id" AND m."role" = 'admin' LIMIT 1),
    (SELECT m."user_id" FROM "crm"."membership" m WHERE m."org_id" = o."id" LIMIT 1)
  ),
  COALESCE(
    (SELECT m."user_id" FROM "crm"."membership" m WHERE m."org_id" = o."id" AND m."role" = 'admin' LIMIT 1),
    (SELECT m."user_id" FROM "crm"."membership" m WHERE m."org_id" = o."id" LIMIT 1)
  )
FROM "crm"."organisation" o
CROSS JOIN (
  VALUES
    ('Price', 0),
    ('Chose a competitor', 1),
    ('No budget', 2),
    ('No response', 3),
    ('Not a fit', 4),
    ('Timing', 5)
) AS seed("name", "position")
WHERE NOT EXISTS (
  SELECT 1 FROM "crm"."lost_reason" lr WHERE lr."org_id" = o."id"
);

INSERT INTO "crm"."pipeline_member" ("org_id", "pipeline_id", "user_id", "created_by")
SELECT m."org_id", p."id", m."user_id", m."user_id"
FROM "crm"."membership" m
INNER JOIN "crm"."pipeline" p ON p."org_id" = m."org_id"
WHERE NOT EXISTS (
  SELECT 1 FROM "crm"."pipeline_member" pm
  WHERE pm."pipeline_id" = p."id" AND pm."user_id" = m."user_id"
);

-- RLS: new tables
ALTER TABLE "crm"."pipeline_member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."pipeline_member" FORCE ROW LEVEL SECURITY;
CREATE POLICY pipeline_member_tenant ON "crm"."pipeline_member"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."lost_reason" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."lost_reason" FORCE ROW LEVEL SECURITY;
CREATE POLICY lost_reason_tenant ON "crm"."lost_reason"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."opportunity_stage_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."opportunity_stage_history" FORCE ROW LEVEL SECURITY;
CREATE POLICY opportunity_stage_history_tenant ON "crm"."opportunity_stage_history"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."opportunity_follower" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."opportunity_follower" FORCE ROW LEVEL SECURITY;
CREATE POLICY opportunity_follower_tenant ON "crm"."opportunity_follower"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."saved_view" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."saved_view" FORCE ROW LEVEL SECURITY;
CREATE POLICY saved_view_tenant ON "crm"."saved_view"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

-- Member pipeline visibility on opportunities (rule 21)
CREATE OR REPLACE FUNCTION crm.app_is_manager() RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.role', true), '') IN ('admin', 'manager', 'system')
$$;

DROP POLICY IF EXISTS opportunity_visibility ON "crm"."opportunity";

CREATE POLICY opportunity_visibility ON "crm"."opportunity" AS RESTRICTIVE
  USING (
    crm.app_is_manager()
    OR "pipeline_id" IN (
      SELECT pm."pipeline_id"
      FROM "crm"."pipeline_member" pm
      WHERE pm."user_id" = nullif(current_setting('app.user_id', true), '')::uuid
    )
  );
