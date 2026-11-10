-- Channels Phase 1 extras: remaining §1.1 tables

CREATE TABLE "crm"."mailbox_shared_access" (
  "mailbox_id" uuid NOT NULL,
  "org_id" uuid NOT NULL,
  "user_id" uuid,
  "team_id" uuid,
  "can_send" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "mailbox_shared_access_one_target" CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL)
  )
);
ALTER TABLE "crm"."mailbox_shared_access" ADD CONSTRAINT "mailbox_shared_access_mailbox_fk"
  FOREIGN KEY ("mailbox_id") REFERENCES "crm"."mailbox_connection"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX "crm_mailbox_shared_access_user"
  ON "crm"."mailbox_shared_access" ("mailbox_id", "user_id") WHERE "user_id" IS NOT NULL;

CREATE TABLE "crm"."mailbox_exclusion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "mailbox_id" uuid,
  "pattern" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL
);
ALTER TABLE "crm"."mailbox_exclusion" ADD CONSTRAINT "mailbox_exclusion_mailbox_fk"
  FOREIGN KEY ("mailbox_id") REFERENCES "crm"."mailbox_connection"("id") ON DELETE CASCADE;
CREATE INDEX "crm_mailbox_exclusion_org" ON "crm"."mailbox_exclusion" ("org_id");

CREATE TABLE "crm"."alpha_sender" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "name" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "crm_alpha_sender_org_name" ON "crm"."alpha_sender" ("org_id", "name");

CREATE TABLE "crm"."verified_caller_id" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "e164" text NOT NULL,
  "provider_sid" text,
  "verified_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "crm_verified_caller_id_org_e164" ON "crm"."verified_caller_id" ("org_id", "e164");

CREATE TABLE "crm"."port_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "numbers" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "current_provider" text,
  "account_reference" text,
  "authorised_name" text,
  "bill_document_key" text,
  "target_date" date,
  "status" text DEFAULT 'draft' NOT NULL,
  "provider_reference" text,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "crm_port_request_org" ON "crm"."port_request" ("org_id", "status");

CREATE TABLE "crm"."whatsapp_sender" (
  "connection_id" uuid PRIMARY KEY NOT NULL,
  "org_id" uuid NOT NULL,
  "waba_id" text NOT NULL,
  "phone_number_id" text NOT NULL,
  "display_name" text,
  "display_name_status" text,
  "quality_rating" text,
  "messaging_limit_tier" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "crm"."whatsapp_sender" ADD CONSTRAINT "whatsapp_sender_connection_fk"
  FOREIGN KEY ("connection_id") REFERENCES "crm"."channel_connection"("id") ON DELETE CASCADE;

ALTER TABLE "crm"."mailbox_shared_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."mailbox_shared_access" FORCE ROW LEVEL SECURITY;
CREATE POLICY mailbox_shared_access_tenant ON "crm"."mailbox_shared_access"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."mailbox_exclusion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."mailbox_exclusion" FORCE ROW LEVEL SECURITY;
CREATE POLICY mailbox_exclusion_tenant ON "crm"."mailbox_exclusion"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."alpha_sender" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."alpha_sender" FORCE ROW LEVEL SECURITY;
CREATE POLICY alpha_sender_tenant ON "crm"."alpha_sender"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."verified_caller_id" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."verified_caller_id" FORCE ROW LEVEL SECURITY;
CREATE POLICY verified_caller_id_tenant ON "crm"."verified_caller_id"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."port_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."port_request" FORCE ROW LEVEL SECURITY;
CREATE POLICY port_request_tenant ON "crm"."port_request"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."whatsapp_sender" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."whatsapp_sender" FORCE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_sender_tenant ON "crm"."whatsapp_sender"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."mailbox_shared_access" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."mailbox_exclusion" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."alpha_sender" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."verified_caller_id" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."port_request" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."whatsapp_sender" TO crm_app;
