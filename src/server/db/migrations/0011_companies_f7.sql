CREATE TYPE "crm"."company_lifecycle" AS ENUM(
  'prospect',
  'customer',
  'former_customer',
  'not_a_fit'
);

CREATE TYPE "crm"."company_lifecycle_source" AS ENUM('derived', 'manual');

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "crm"."company"
  ADD COLUMN IF NOT EXISTS "name_normalised" text,
  ADD COLUMN IF NOT EXISTS "domain_normalised" text,
  ADD COLUMN IF NOT EXISTS "website_url" text,
  ADD COLUMN IF NOT EXISTS "phone_e164" text,
  ADD COLUMN IF NOT EXISTS "address_line1" text,
  ADD COLUMN IF NOT EXISTS "address_line2" text,
  ADD COLUMN IF NOT EXISTS "city" text,
  ADD COLUMN IF NOT EXISTS "postcode" text,
  ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'GB' NOT NULL,
  ADD COLUMN IF NOT EXISTS "companies_house_number" text,
  ADD COLUMN IF NOT EXISTS "description" text,
  ADD COLUMN IF NOT EXISTS "linkedin_url" text,
  ADD COLUMN IF NOT EXISTS "lifecycle" "crm"."company_lifecycle" DEFAULT 'prospect' NOT NULL,
  ADD COLUMN IF NOT EXISTS "lifecycle_source" "crm"."company_lifecycle_source" DEFAULT 'derived' NOT NULL,
  ADD COLUMN IF NOT EXISTS "parent_company_id" uuid,
  ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "next_task_due_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "merged_into_id" uuid,
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

UPDATE "crm"."company"
SET
  "phone_e164" = COALESCE("phone_e164", "phone"),
  "address_line1" = COALESCE("address_line1", "address"),
  "name_normalised" = lower(regexp_replace(trim("name"), '[^a-zA-Z0-9]+', ' ', 'g')),
  "domain_normalised" = lower(trim("domain"))
WHERE "name_normalised" IS NULL OR "domain_normalised" IS NULL OR "phone_e164" IS NULL;

ALTER TABLE "crm"."company"
  DROP COLUMN IF EXISTS "phone",
  DROP COLUMN IF EXISTS "address";

ALTER TABLE "crm"."company"
  ADD CONSTRAINT "company_parent_company_id_fk"
  FOREIGN KEY ("parent_company_id") REFERENCES "crm"."company"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "crm"."company"
  ADD CONSTRAINT "company_merged_into_id_fk"
  FOREIGN KEY ("merged_into_id") REFERENCES "crm"."company"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "crm"."company"
  ADD CONSTRAINT "company_size_band_check"
  CHECK (
    "size_band" IS NULL
    OR "size_band" IN ('1-5', '6-20', '21-50', '51-200', '200+')
  );

ALTER TABLE "crm"."smart_list"
  ADD COLUMN IF NOT EXISTS "entity_type" text DEFAULT 'contact' NOT NULL;

ALTER TABLE "crm"."custom_field_value"
  ADD COLUMN IF NOT EXISTS "company_id" uuid;

ALTER TABLE "crm"."custom_field_value"
  ALTER COLUMN "contact_id" DROP NOT NULL;

ALTER TABLE "crm"."custom_field_value"
  ADD CONSTRAINT "custom_field_value_company_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "crm"."company"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."custom_field_value"
  ADD CONSTRAINT "custom_field_value_entity_check"
  CHECK (
    ("contact_id" IS NOT NULL AND "company_id" IS NULL)
    OR ("contact_id" IS NULL AND "company_id" IS NOT NULL)
  );

CREATE TABLE "crm"."company_domain" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "domain_normalised" text NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL
);

CREATE TABLE "crm"."company_follower" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL
);

CREATE TABLE "crm"."company_tag" (
  "company_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "org_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("company_id", "tag_id")
);

CREATE TABLE "crm"."company_stats" (
  "company_id" uuid PRIMARY KEY NOT NULL,
  "org_id" uuid NOT NULL,
  "open_deal_count" integer DEFAULT 0 NOT NULL,
  "open_pipeline_value" bigint DEFAULT 0 NOT NULL,
  "won_value_total" bigint DEFAULT 0 NOT NULL,
  "contact_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "crm"."company_merge_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "surviving_id" uuid NOT NULL,
  "merged_id" uuid NOT NULL,
  "field_choices" jsonb NOT NULL,
  "merged_by" uuid NOT NULL,
  "merged_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "crm"."dismissed_duplicate" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "id_a" uuid NOT NULL,
  "id_b" uuid NOT NULL,
  "dismissed_by" uuid NOT NULL,
  "dismissed_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."company_domain"
  ADD CONSTRAINT "company_domain_company_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "crm"."company"("id") ON DELETE cascade;

ALTER TABLE "crm"."company_follower"
  ADD CONSTRAINT "company_follower_company_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "crm"."company"("id") ON DELETE cascade;

ALTER TABLE "crm"."company_tag"
  ADD CONSTRAINT "company_tag_company_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "crm"."company"("id") ON DELETE cascade,
  ADD CONSTRAINT "company_tag_tag_id_fk"
  FOREIGN KEY ("tag_id") REFERENCES "crm"."tag"("id") ON DELETE cascade;

ALTER TABLE "crm"."company_stats"
  ADD CONSTRAINT "company_stats_company_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "crm"."company"("id") ON DELETE cascade;

ALTER TABLE "crm"."company_merge_log"
  ADD CONSTRAINT "company_merge_log_surviving_fk"
  FOREIGN KEY ("surviving_id") REFERENCES "crm"."company"("id"),
  ADD CONSTRAINT "company_merge_log_merged_fk"
  FOREIGN KEY ("merged_id") REFERENCES "crm"."company"("id");

INSERT INTO "crm"."company_stats" ("company_id", "org_id", "contact_count", "updated_at")
SELECT c."id", c."org_id", 0, now()
FROM "crm"."company" c
WHERE NOT EXISTS (
  SELECT 1 FROM "crm"."company_stats" s WHERE s."company_id" = c."id"
);

INSERT INTO "crm"."company_domain" ("org_id", "company_id", "domain_normalised", "is_primary", "created_by")
SELECT c."org_id", c."id", c."domain_normalised", true, c."created_by"
FROM "crm"."company" c
WHERE c."domain_normalised" IS NOT NULL
  AND c."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "crm"."company_domain" d
    WHERE d."company_id" = c."id" AND d."domain_normalised" = c."domain_normalised"
  );

UPDATE "crm"."company" c
SET "search_vector" = (
  setweight(to_tsvector('simple', coalesce(c."name", '')), 'A')
  || setweight(to_tsvector('simple', coalesce(c."domain_normalised", '')), 'B')
  || setweight(to_tsvector('simple', coalesce(c."city", '')), 'C')
  || setweight(to_tsvector('simple', coalesce(c."companies_house_number", '')), 'C')
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_company_domain_org_domain"
  ON "crm"."company_domain" ("org_id", "domain_normalised")
  WHERE "domain_normalised" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "crm_company_org_name_normalised"
  ON "crm"."company" ("org_id", "name_normalised")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "crm_company_org_owner"
  ON "crm"."company" ("org_id", "owner_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "crm_company_org_lifecycle"
  ON "crm"."company" ("org_id", "lifecycle")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "crm_company_org_last_activity"
  ON "crm"."company" ("org_id", "last_activity_at" DESC NULLS LAST, "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "crm_company_org_created"
  ON "crm"."company" ("org_id", "created_at" DESC, "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "crm_company_org_companies_house"
  ON "crm"."company" ("org_id", "companies_house_number")
  WHERE "deleted_at" IS NULL AND "companies_house_number" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "crm_company_name_trgm"
  ON "crm"."company" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "crm_company_search_vector_gin"
  ON "crm"."company" USING gin ("search_vector");

CREATE INDEX IF NOT EXISTS "crm_company_stats_org_pipeline"
  ON "crm"."company_stats" ("org_id", "open_pipeline_value" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_dismissed_duplicate_pair"
  ON "crm"."dismissed_duplicate" ("org_id", "entity_type", "id_a", "id_b");

ALTER TABLE "crm"."company_domain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."company_domain" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_domain_tenant ON "crm"."company_domain"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."company_follower" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."company_follower" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_follower_tenant ON "crm"."company_follower"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."company_tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."company_tag" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_tag_tenant ON "crm"."company_tag"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."company_stats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."company_stats" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_stats_tenant ON "crm"."company_stats"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."company_merge_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."company_merge_log" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_merge_log_tenant ON "crm"."company_merge_log"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."dismissed_duplicate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."dismissed_duplicate" FORCE ROW LEVEL SECURITY;
CREATE POLICY dismissed_duplicate_tenant ON "crm"."dismissed_duplicate"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
