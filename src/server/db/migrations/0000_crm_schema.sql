-- Create CRM schema and membership table with forced RLS.
-- Generated for Sponsoro CRM; review before applying to any shared database.

CREATE SCHEMA IF NOT EXISTS "crm";

CREATE TYPE "crm"."crm_role" AS ENUM('admin', 'manager', 'member');
CREATE TYPE "crm"."member_status" AS ENUM('active', 'pending', 'suspended');

CREATE TABLE "crm"."organisation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "crm"."user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "password_hash" text,
  "full_name" text NOT NULL,
  "status" "crm"."member_status" DEFAULT 'active' NOT NULL,
  "email_verified_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "crm_user_email_unique" ON "crm"."user" ("email");

CREATE TABLE "crm"."session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."session"
  ADD CONSTRAINT "session_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "crm"."user"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE TABLE "crm"."membership" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" "crm"."crm_role" DEFAULT 'member' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."membership"
  ADD CONSTRAINT "membership_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."membership"
  ADD CONSTRAINT "membership_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "crm"."user"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "crm_membership_org_user_unique"
  ON "crm"."membership" ("org_id", "user_id");

ALTER TABLE "crm"."membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."membership" FORCE ROW LEVEL SECURITY;

CREATE POLICY membership_tenant ON "crm"."membership"
  USING (
    org_id = nullif(current_setting('app.org_id', true), '')::uuid
    OR current_setting('app.auth_operation', true) = 'sign_up'
  )
  WITH CHECK (
    org_id = nullif(current_setting('app.org_id', true), '')::uuid
    OR current_setting('app.auth_operation', true) = 'sign_up'
  );

ALTER TABLE "crm"."organisation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."organisation" FORCE ROW LEVEL SECURITY;

CREATE POLICY organisation_tenant ON "crm"."organisation"
  USING (
    id = nullif(current_setting('app.org_id', true), '')::uuid
    OR current_setting('app.auth_operation', true) = 'sign_up'
  )
  WITH CHECK (
    id = nullif(current_setting('app.org_id', true), '')::uuid
    OR current_setting('app.auth_operation', true) = 'sign_up'
  );
