-- Onboarding tables (CRM custom auth). Review before apply.

CREATE TYPE "crm"."agreement_kind" AS ENUM('terms', 'dpa');
CREATE TYPE "crm"."access_request_status" AS ENUM('pending', 'approved', 'declined');

CREATE TABLE "crm"."organisation_settings" (
  "org_id" uuid PRIMARY KEY NOT NULL,
  "display_name" text NOT NULL,
  "industry" text,
  "team_size_band" text,
  "country" text DEFAULT 'GB' NOT NULL,
  "currency" text DEFAULT 'GBP' NOT NULL,
  "time_zone" text DEFAULT 'Europe/London' NOT NULL,
  "postal_address" text,
  "logo_object_key" text,
  "onboarding_completed_at" timestamptz,
  "onboarding_completed_by" uuid,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

ALTER TABLE "crm"."organisation_settings"
  ADD CONSTRAINT "organisation_settings_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."organisation_settings"
  ADD CONSTRAINT "organisation_settings_onboarding_completed_by_user_id_fk"
  FOREIGN KEY ("onboarding_completed_by") REFERENCES "crm"."user"("id") ON DELETE set null;

ALTER TABLE "crm"."organisation_settings"
  ADD CONSTRAINT "organisation_settings_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id");

ALTER TABLE "crm"."organisation_settings"
  ADD CONSTRAINT "organisation_settings_updated_by_user_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id");

CREATE TABLE "crm"."onboarding_progress" (
  "org_id" uuid PRIMARY KEY NOT NULL,
  "current_step" text,
  "completed_steps" text[] DEFAULT '{}' NOT NULL,
  "skipped_steps" text[] DEFAULT '{}' NOT NULL,
  "step_drafts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "setup_started_by_user_id" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

ALTER TABLE "crm"."onboarding_progress"
  ADD CONSTRAINT "onboarding_progress_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."onboarding_progress"
  ADD CONSTRAINT "onboarding_progress_setup_started_by_user_id_fk"
  FOREIGN KEY ("setup_started_by_user_id") REFERENCES "crm"."user"("id") ON DELETE set null;

ALTER TABLE "crm"."onboarding_progress"
  ADD CONSTRAINT "onboarding_progress_updated_by_user_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id");

CREATE TABLE "crm"."user_profile" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "job_title" text,
  "phone_e164" text,
  "time_zone" text,
  "notification_email" text,
  "profile_completed_at" timestamptz,
  "tour_completed_at" timestamptz,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."user_profile"
  ADD CONSTRAINT "user_profile_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "crm"."user"("id") ON DELETE cascade;

CREATE TABLE "crm"."agreement_acceptance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "agreement" "crm"."agreement_kind" NOT NULL,
  "version" text NOT NULL,
  "accepted_by" uuid NOT NULL,
  "accepted_at" timestamptz DEFAULT now() NOT NULL,
  "ip_hash" text NOT NULL
);

ALTER TABLE "crm"."agreement_acceptance"
  ADD CONSTRAINT "agreement_acceptance_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."agreement_acceptance"
  ADD CONSTRAINT "agreement_acceptance_accepted_by_user_id_fk"
  FOREIGN KEY ("accepted_by") REFERENCES "crm"."user"("id");

CREATE UNIQUE INDEX "crm_agreement_acceptance_org_agreement_version"
  ON "crm"."agreement_acceptance" ("org_id", "agreement", "version");

CREATE TABLE "crm"."access_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "requester_user_id" uuid NOT NULL,
  "status" "crm"."access_request_status" DEFAULT 'pending' NOT NULL,
  "handled_by" uuid,
  "handled_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."access_request"
  ADD CONSTRAINT "access_request_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."access_request"
  ADD CONSTRAINT "access_request_requester_user_id_user_id_fk"
  FOREIGN KEY ("requester_user_id") REFERENCES "crm"."user"("id") ON DELETE cascade;

ALTER TABLE "crm"."access_request"
  ADD CONSTRAINT "access_request_handled_by_user_id_fk"
  FOREIGN KEY ("handled_by") REFERENCES "crm"."user"("id") ON DELETE set null;

CREATE INDEX "crm_access_request_org_idx" ON "crm"."access_request" ("org_id");
CREATE INDEX "crm_access_request_requester_idx" ON "crm"."access_request" ("requester_user_id");

-- Backfill existing organisations as already onboarded (pre-onboarding users).
INSERT INTO "crm"."organisation_settings" (
  "org_id",
  "display_name",
  "country",
  "currency",
  "time_zone",
  "onboarding_completed_at",
  "onboarding_completed_by",
  "created_by",
  "updated_by"
)
SELECT
  o.id,
  o.name,
  'GB',
  'GBP',
  'Europe/London',
  now(),
  (SELECT m.user_id FROM "crm"."membership" m WHERE m.org_id = o.id AND m.role = 'admin' LIMIT 1),
  COALESCE(
    (SELECT m.user_id FROM "crm"."membership" m WHERE m.org_id = o.id AND m.role = 'admin' LIMIT 1),
    (SELECT m.user_id FROM "crm"."membership" m WHERE m.org_id = o.id LIMIT 1)
  ),
  COALESCE(
    (SELECT m.user_id FROM "crm"."membership" m WHERE m.org_id = o.id AND m.role = 'admin' LIMIT 1),
    (SELECT m.user_id FROM "crm"."membership" m WHERE m.org_id = o.id LIMIT 1)
  )
FROM "crm"."organisation" o
ON CONFLICT ("org_id") DO NOTHING;

-- RLS: membership self-read for entry routing
CREATE POLICY membership_self_read ON "crm"."membership"
  FOR SELECT
  USING (
    user_id = nullif(current_setting('app.user_id', true), '')::uuid
  );

CREATE POLICY organisation_member_read ON "crm"."organisation"
  FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM "crm"."membership"
      WHERE user_id = nullif(current_setting('app.user_id', true), '')::uuid
    )
    OR current_setting('app.auth_operation', true) = 'sign_up'
  );

ALTER TABLE "crm"."organisation_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."organisation_settings" FORCE ROW LEVEL SECURITY;

CREATE POLICY organisation_settings_tenant ON "crm"."organisation_settings"
  USING (
    org_id = nullif(current_setting('app.org_id', true), '')::uuid
    OR current_setting('app.auth_operation', true) = 'sign_up'
  )
  WITH CHECK (
    org_id = nullif(current_setting('app.org_id', true), '')::uuid
    OR current_setting('app.auth_operation', true) = 'sign_up'
  );

CREATE POLICY organisation_settings_member_read ON "crm"."organisation_settings"
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM "crm"."membership"
      WHERE user_id = nullif(current_setting('app.user_id', true), '')::uuid
    )
  );

ALTER TABLE "crm"."onboarding_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."onboarding_progress" FORCE ROW LEVEL SECURITY;

CREATE POLICY onboarding_progress_tenant ON "crm"."onboarding_progress"
  USING (
    org_id = nullif(current_setting('app.org_id', true), '')::uuid
    OR current_setting('app.auth_operation', true) = 'sign_up'
  )
  WITH CHECK (
    org_id = nullif(current_setting('app.org_id', true), '')::uuid
    OR current_setting('app.auth_operation', true) = 'sign_up'
  );

CREATE POLICY onboarding_progress_member_read ON "crm"."onboarding_progress"
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM "crm"."membership"
      WHERE user_id = nullif(current_setting('app.user_id', true), '')::uuid
    )
  );

ALTER TABLE "crm"."user_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."user_profile" FORCE ROW LEVEL SECURITY;

CREATE POLICY user_profile_self ON "crm"."user_profile"
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE "crm"."agreement_acceptance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."agreement_acceptance" FORCE ROW LEVEL SECURITY;

CREATE POLICY agreement_acceptance_tenant ON "crm"."agreement_acceptance"
  FOR SELECT
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY agreement_acceptance_insert ON "crm"."agreement_acceptance"
  FOR INSERT
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."access_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."access_request" FORCE ROW LEVEL SECURITY;

CREATE POLICY access_request_tenant ON "crm"."access_request"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

CREATE POLICY access_request_self ON "crm"."access_request"
  FOR SELECT
  USING (requester_user_id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY access_request_self_insert ON "crm"."access_request"
  FOR INSERT
  WITH CHECK (requester_user_id = nullif(current_setting('app.user_id', true), '')::uuid);
