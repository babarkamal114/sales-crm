CREATE TYPE "crm"."audit_actor_type" AS ENUM('user', 'system', 'webhook', 'api_key');
CREATE TYPE "crm"."pipeline_stage_kind" AS ENUM('open', 'won', 'lost');
CREATE TYPE "crm"."opportunity_status" AS ENUM('open', 'won', 'lost');
CREATE TYPE "crm"."integration_status" AS ENUM('disconnected', 'pending', 'connected', 'error');
CREATE TYPE "crm"."member_invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');

ALTER TABLE "crm"."organisation_settings"
  ADD COLUMN IF NOT EXISTS "lead_sources" text[] DEFAULT '{}' NOT NULL,
  ADD COLUMN IF NOT EXISTS "contact_channels" text[] DEFAULT '{}' NOT NULL;

CREATE TABLE "crm"."audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "actor_type" "crm"."audit_actor_type" NOT NULL,
  "actor_id" text NOT NULL,
  "on_behalf_of" uuid,
  "action" text NOT NULL,
  "entity_type" text,
  "entity_id" text,
  "changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "prev_hash" text,
  "hash" text NOT NULL
);

ALTER TABLE "crm"."audit_log"
  ADD CONSTRAINT "audit_log_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE TABLE "crm"."pipeline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

ALTER TABLE "crm"."pipeline"
  ADD CONSTRAINT "pipeline_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."pipeline"
  ADD CONSTRAINT "pipeline_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "crm"."pipeline"
  ADD CONSTRAINT "pipeline_updated_by_user_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX "crm_pipeline_org_slug" ON "crm"."pipeline" ("org_id", "slug");

CREATE TABLE "crm"."pipeline_stage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "pipeline_id" uuid NOT NULL,
  "name" text NOT NULL,
  "kind" "crm"."pipeline_stage_kind" DEFAULT 'open' NOT NULL,
  "position" integer NOT NULL,
  "win_likelihood" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."pipeline_stage"
  ADD CONSTRAINT "pipeline_stage_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."pipeline_stage"
  ADD CONSTRAINT "pipeline_stage_pipeline_id_pipeline_id_fk"
  FOREIGN KEY ("pipeline_id") REFERENCES "crm"."pipeline"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "crm_pipeline_stage_pipeline_position"
  ON "crm"."pipeline_stage" ("pipeline_id", "position");

CREATE TABLE "crm"."contact" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "display_name" text NOT NULL,
  "email" text,
  "phone_e164" text,
  "owner_id" uuid NOT NULL,
  "marketing_consent" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

ALTER TABLE "crm"."contact"
  ADD CONSTRAINT "contact_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."contact"
  ADD CONSTRAINT "contact_owner_id_user_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "crm"."contact"
  ADD CONSTRAINT "contact_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "crm"."contact"
  ADD CONSTRAINT "contact_updated_by_user_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

CREATE TABLE "crm"."opportunity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "pipeline_id" uuid NOT NULL,
  "stage_id" uuid NOT NULL,
  "title" text NOT NULL,
  "status" "crm"."opportunity_status" DEFAULT 'open' NOT NULL,
  "value_pence" integer,
  "owner_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_contact_id_contact_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_pipeline_id_pipeline_id_fk"
  FOREIGN KEY ("pipeline_id") REFERENCES "crm"."pipeline"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_stage_id_pipeline_stage_id_fk"
  FOREIGN KEY ("stage_id") REFERENCES "crm"."pipeline_stage"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_owner_id_user_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "crm"."opportunity"
  ADD CONSTRAINT "opportunity_updated_by_user_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

CREATE TABLE "crm"."integration_connection" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "capability" text NOT NULL,
  "status" "crm"."integration_status" DEFAULT 'disconnected' NOT NULL,
  "external_account_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "connected_by" uuid,
  "connected_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."integration_connection"
  ADD CONSTRAINT "integration_connection_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."integration_connection"
  ADD CONSTRAINT "integration_connection_connected_by_user_id_fk"
  FOREIGN KEY ("connected_by") REFERENCES "crm"."user"("id")
  ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX "crm_integration_connection_org_provider"
  ON "crm"."integration_connection" ("org_id", "provider");

CREATE TABLE "crm"."member_invitation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "email" text NOT NULL,
  "role" "crm"."crm_role" DEFAULT 'member' NOT NULL,
  "status" "crm"."member_invitation_status" DEFAULT 'pending' NOT NULL,
  "invited_by" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."member_invitation"
  ADD CONSTRAINT "member_invitation_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."member_invitation"
  ADD CONSTRAINT "member_invitation_invited_by_user_id_fk"
  FOREIGN KEY ("invited_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

-- RLS: audit_log (append-only for app role)
ALTER TABLE "crm"."audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."audit_log" FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_log_tenant_insert ON "crm"."audit_log"
  FOR INSERT
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY audit_log_member_read ON "crm"."audit_log"
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM "crm"."membership"
      WHERE user_id = nullif(current_setting('app.user_id', true), '')::uuid
    )
  );

-- RLS: tenant tables
ALTER TABLE "crm"."pipeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."pipeline" FORCE ROW LEVEL SECURITY;

CREATE POLICY pipeline_tenant ON "crm"."pipeline"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."pipeline_stage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."pipeline_stage" FORCE ROW LEVEL SECURITY;

CREATE POLICY pipeline_stage_tenant ON "crm"."pipeline_stage"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact" FORCE ROW LEVEL SECURITY;

CREATE POLICY contact_tenant ON "crm"."contact"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."opportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."opportunity" FORCE ROW LEVEL SECURITY;

CREATE POLICY opportunity_tenant ON "crm"."opportunity"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."integration_connection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."integration_connection" FORCE ROW LEVEL SECURITY;

CREATE POLICY integration_connection_tenant ON "crm"."integration_connection"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."member_invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."member_invitation" FORCE ROW LEVEL SECURITY;

CREATE POLICY member_invitation_tenant ON "crm"."member_invitation"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
