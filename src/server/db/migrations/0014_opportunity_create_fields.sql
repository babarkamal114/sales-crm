CREATE TYPE "crm"."opportunity_value_type" AS ENUM(
  'one_off',
  'recurring_monthly',
  'recurring_annual'
);

CREATE TYPE "crm"."opportunity_priority" AS ENUM('low', 'normal', 'high');

ALTER TABLE "crm"."opportunity"
  ADD COLUMN IF NOT EXISTS "value_type" "crm"."opportunity_value_type" DEFAULT 'one_off' NOT NULL,
  ADD COLUMN IF NOT EXISTS "priority" "crm"."opportunity_priority" DEFAULT 'normal' NOT NULL;

CREATE TABLE IF NOT EXISTS "crm"."opportunity_tag" (
  "opportunity_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "org_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("opportunity_id", "tag_id")
);

ALTER TABLE "crm"."opportunity_tag"
  ADD CONSTRAINT "opportunity_tag_opportunity_id_fk"
  FOREIGN KEY ("opportunity_id") REFERENCES "crm"."opportunity"("id") ON DELETE cascade;

ALTER TABLE "crm"."opportunity_tag"
  ADD CONSTRAINT "opportunity_tag_tag_id_fk"
  FOREIGN KEY ("tag_id") REFERENCES "crm"."tag"("id") ON DELETE cascade;

ALTER TABLE "crm"."opportunity_tag"
  ADD CONSTRAINT "opportunity_tag_org_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."opportunity_tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."opportunity_tag" FORCE ROW LEVEL SECURITY;

CREATE POLICY opportunity_tag_tenant ON "crm"."opportunity_tag"
  USING ("org_id" = current_setting('app.current_org_id', true)::uuid);
