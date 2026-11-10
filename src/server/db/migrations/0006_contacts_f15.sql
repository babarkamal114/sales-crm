CREATE TYPE "crm"."recipient_type" AS ENUM('individual', 'corporate');
CREATE TYPE "crm"."contact_lifecycle" AS ENUM('lead', 'customer', 'former_customer', 'not_a_fit');
CREATE TYPE "crm"."phone_type" AS ENUM('mobile', 'landline');
CREATE TYPE "crm"."consent_channel" AS ENUM('email', 'sms', 'whatsapp', 'call');
CREATE TYPE "crm"."marketing_consent_state" AS ENUM('granted', 'denied', 'unknown');
CREATE TYPE "crm"."attribution_touch" AS ENUM('first', 'latest');
CREATE TYPE "crm"."custom_field_type" AS ENUM(
  'text', 'number', 'date', 'select', 'multi_select', 'boolean', 'url', 'phone', 'email', 'currency'
);

ALTER TABLE "crm"."contact"
  ADD COLUMN IF NOT EXISTS "first_name" text,
  ADD COLUMN IF NOT EXISTS "last_name" text,
  ADD COLUMN IF NOT EXISTS "email_normalised" text,
  ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "phone_type" "crm"."phone_type",
  ADD COLUMN IF NOT EXISTS "job_title" text,
  ADD COLUMN IF NOT EXISTS "company_id" uuid,
  ADD COLUMN IF NOT EXISTS "recipient_type" "crm"."recipient_type" DEFAULT 'individual' NOT NULL,
  ADD COLUMN IF NOT EXISTS "lifecycle" "crm"."contact_lifecycle" DEFAULT 'lead' NOT NULL,
  ADD COLUMN IF NOT EXISTS "social_url" text,
  ADD COLUMN IF NOT EXISTS "avatar_key" text,
  ADD COLUMN IF NOT EXISTS "source" text,
  ADD COLUMN IF NOT EXISTS "campaign" text,
  ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "next_task_due_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "restricted" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "merged_into_id" uuid,
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

UPDATE "crm"."contact"
SET
  "first_name" = COALESCE(NULLIF(split_part(trim("display_name"), ' ', 1), ''), trim("display_name")),
  "last_name" = NULLIF(trim(substring(trim("display_name") from position(' ' in trim("display_name")) + 1)), ''),
  "email_normalised" = lower(trim("email"))
WHERE "first_name" IS NULL;

UPDATE "crm"."contact"
SET "first_name" = COALESCE("first_name", 'Contact')
WHERE "first_name" IS NULL OR trim("first_name") = '';

ALTER TABLE "crm"."contact"
  ALTER COLUMN "first_name" SET NOT NULL;

ALTER TABLE "crm"."contact"
  ALTER COLUMN "last_name" SET DEFAULT '';

ALTER TABLE "crm"."contact"
  ALTER COLUMN "last_name" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "crm_contact_org_email_normalised"
  ON "crm"."contact" ("org_id", "email_normalised")
  WHERE "deleted_at" IS NULL AND "email_normalised" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "crm_contact_org_phone"
  ON "crm"."contact" ("org_id", "phone_e164")
  WHERE "deleted_at" IS NULL AND "phone_e164" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "crm_contact_org_owner"
  ON "crm"."contact" ("org_id", "owner_id");

CREATE INDEX IF NOT EXISTS "crm_contact_org_created"
  ON "crm"."contact" ("org_id", "created_at" DESC, "id");

CREATE INDEX IF NOT EXISTS "crm_contact_org_last_activity"
  ON "crm"."contact" ("org_id", "last_activity_at" DESC NULLS LAST, "id");

CREATE INDEX IF NOT EXISTS "crm_contact_org_company"
  ON "crm"."contact" ("org_id", "company_id");

CREATE TABLE "crm"."company" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "name" text NOT NULL,
  "domain" text,
  "phone" text,
  "address" text,
  "size_band" text,
  "industry" text,
  "owner_id" uuid NOT NULL,
  "recipient_type" "crm"."recipient_type" DEFAULT 'corporate' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "crm"."contact"
  ADD CONSTRAINT "contact_company_id_company_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "crm"."company"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "crm"."contact"
  ADD CONSTRAINT "contact_merged_into_id_contact_id_fk"
  FOREIGN KEY ("merged_into_id") REFERENCES "crm"."contact"("id")
  ON DELETE set null ON UPDATE no action;

CREATE TABLE "crm"."contact_company" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "role" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "crm"."contact_follower" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL
);

CREATE TABLE "crm"."tag" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "name" text NOT NULL,
  "colour_key" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL
);

CREATE TABLE "crm"."contact_tag" (
  "contact_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "org_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("contact_id", "tag_id")
);

CREATE TABLE "crm"."custom_field" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "field_type" "crm"."custom_field_type" NOT NULL,
  "options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL
);

CREATE TABLE "crm"."custom_field_value" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "custom_field_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

CREATE TABLE "crm"."contact_consent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "channel" "crm"."consent_channel" NOT NULL,
  "dnd" boolean DEFAULT false NOT NULL,
  "marketing_consent" "crm"."marketing_consent_state" DEFAULT 'unknown' NOT NULL,
  "source" text,
  "wording" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

CREATE UNIQUE INDEX "crm_contact_consent_contact_channel"
  ON "crm"."contact_consent" ("org_id", "contact_id", "channel");

CREATE TABLE "crm"."contact_consent_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "channel" "crm"."consent_channel" NOT NULL,
  "dnd" boolean NOT NULL,
  "marketing_consent" "crm"."marketing_consent_state" NOT NULL,
  "reason" text,
  "changed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "changed_by" uuid NOT NULL
);

CREATE TABLE "crm"."attribution" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "touch" "crm"."attribution_touch" NOT NULL,
  "source" text,
  "medium" text,
  "campaign" text,
  "ad_set" text,
  "ad" text,
  "form" text,
  "page_url" text,
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "crm_attribution_contact_touch"
  ON "crm"."attribution" ("org_id", "contact_id", "touch");

CREATE TABLE "crm"."smart_list" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "name" text NOT NULL,
  "owner_id" uuid,
  "filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "sort" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

CREATE TABLE "crm"."suppression" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "email_hash" text,
  "phone_hash" text,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "crm"."contact_merge_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "surviving_id" uuid NOT NULL,
  "merged_id" uuid NOT NULL,
  "field_choices" jsonb NOT NULL,
  "merged_by" uuid NOT NULL,
  "merged_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- FKs (abbreviated — org, contact, user)
ALTER TABLE "crm"."company"
  ADD CONSTRAINT "company_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_company"
  ADD CONSTRAINT "contact_company_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade,
  ADD CONSTRAINT "contact_company_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "crm"."company"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_follower"
  ADD CONSTRAINT "contact_follower_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_tag"
  ADD CONSTRAINT "contact_tag_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade,
  ADD CONSTRAINT "contact_tag_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "crm"."tag"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_consent"
  ADD CONSTRAINT "contact_consent_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;

ALTER TABLE "crm"."attribution"
  ADD CONSTRAINT "attribution_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;

-- RLS tenant policies
ALTER TABLE "crm"."company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."company" FORCE ROW LEVEL SECURITY;
CREATE POLICY company_tenant ON "crm"."company"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."contact_company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_company" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_company_tenant ON "crm"."contact_company"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."contact_follower" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_follower" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_follower_tenant ON "crm"."contact_follower"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."tag" FORCE ROW LEVEL SECURITY;
CREATE POLICY tag_tenant ON "crm"."tag"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."contact_tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_tag" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_tag_tenant ON "crm"."contact_tag"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."custom_field" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."custom_field" FORCE ROW LEVEL SECURITY;
CREATE POLICY custom_field_tenant ON "crm"."custom_field"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."custom_field_value" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."custom_field_value" FORCE ROW LEVEL SECURITY;
CREATE POLICY custom_field_value_tenant ON "crm"."custom_field_value"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."contact_consent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_consent" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_consent_tenant ON "crm"."contact_consent"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."contact_consent_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_consent_history" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_consent_history_tenant ON "crm"."contact_consent_history"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."attribution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."attribution" FORCE ROW LEVEL SECURITY;
CREATE POLICY attribution_tenant ON "crm"."attribution"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."smart_list" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."smart_list" FORCE ROW LEVEL SECURITY;
CREATE POLICY smart_list_tenant ON "crm"."smart_list"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."suppression" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."suppression" FORCE ROW LEVEL SECURITY;
CREATE POLICY suppression_tenant ON "crm"."suppression"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."contact_merge_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_merge_log" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_merge_log_tenant ON "crm"."contact_merge_log"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

-- Member contact visibility (rule 21)
CREATE OR REPLACE FUNCTION crm.contact_visible_to_member(p_contact_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT
    crm.app_is_manager()
    OR EXISTS (
      SELECT 1 FROM "crm"."contact" c
      WHERE c.id = p_contact_id
        AND c.org_id = nullif(current_setting('app.org_id', true), '')::uuid
        AND (
          c.owner_id = nullif(current_setting('app.user_id', true), '')::uuid
          OR EXISTS (
            SELECT 1 FROM "crm"."contact_follower" cf
            WHERE cf.contact_id = c.id
              AND cf.user_id = nullif(current_setting('app.user_id', true), '')::uuid
          )
          OR EXISTS (
            SELECT 1 FROM "crm"."opportunity" o
            WHERE o.contact_id = c.id
              AND o.deleted_at IS NULL
              AND o.pipeline_id IN (
                SELECT pm.pipeline_id FROM "crm"."pipeline_member" pm
                WHERE pm.user_id = nullif(current_setting('app.user_id', true), '')::uuid
              )
          )
        )
    )
$$;

DROP POLICY IF EXISTS contact_visibility ON "crm"."contact";
CREATE POLICY contact_visibility ON "crm"."contact" AS RESTRICTIVE
  USING (crm.contact_visible_to_member(id))
  WITH CHECK (crm.contact_visible_to_member(id));
