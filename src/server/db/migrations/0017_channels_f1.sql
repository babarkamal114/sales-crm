-- Channels Phase 1: connections, mailboxes, numbers, usage (schema + RLS)

CREATE TYPE "crm"."channel_kind" AS ENUM('sms', 'voice', 'whatsapp');
CREATE TYPE "crm"."channel_mode" AS ENUM('managed', 'byo');
CREATE TYPE "crm"."channel_provider" AS ENUM('twilio', 'meta', 'vonage', 'telnyx');
CREATE TYPE "crm"."channel_connection_status" AS ENUM(
  'draft', 'pending', 'verifying', 'active', 'degraded', 'failed', 'suspended', 'disconnected'
);
CREATE TYPE "crm"."mailbox_kind" AS ENUM('personal', 'shared');
CREATE TYPE "crm"."mailbox_provider" AS ENUM('google', 'microsoft', 'imap');
CREATE TYPE "crm"."mailbox_status" AS ENUM(
  'connecting', 'syncing_initial', 'active', 'degraded', 'reconnect_required', 'disconnected'
);
CREATE TYPE "crm"."mailbox_sync_mode" AS ENUM('push', 'poll');

CREATE TABLE "crm"."channel_connection" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "channel" "crm"."channel_kind" NOT NULL,
  "mode" "crm"."channel_mode" DEFAULT 'managed' NOT NULL,
  "provider" "crm"."channel_provider" NOT NULL,
  "status" "crm"."channel_connection_status" DEFAULT 'draft' NOT NULL,
  "status_reason" text,
  "provider_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "credentials_ciphertext" text,
  "credentials_key_id" text,
  "credentials_last4" text,
  "webhook_secret_ciphertext" text,
  "is_default" boolean DEFAULT false NOT NULL,
  "last_checked_at" timestamptz,
  "connected_by" uuid,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);
ALTER TABLE "crm"."channel_connection" ADD CONSTRAINT "channel_connection_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE CASCADE;
ALTER TABLE "crm"."channel_connection" ADD CONSTRAINT "channel_connection_connected_by_fk"
  FOREIGN KEY ("connected_by") REFERENCES "crm"."user"("id") ON DELETE SET NULL;
ALTER TABLE "crm"."channel_connection" ADD CONSTRAINT "channel_connection_created_by_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id");
ALTER TABLE "crm"."channel_connection" ADD CONSTRAINT "channel_connection_updated_by_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id");
CREATE INDEX "crm_channel_connection_org" ON "crm"."channel_connection" ("org_id", "channel", "status");
CREATE UNIQUE INDEX "crm_channel_connection_default"
  ON "crm"."channel_connection" ("org_id", "channel") WHERE "is_default" = true;

CREATE TABLE "crm"."mailbox_connection" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "kind" "crm"."mailbox_kind" DEFAULT 'personal' NOT NULL,
  "provider" "crm"."mailbox_provider" NOT NULL,
  "email_address" text NOT NULL,
  "display_name" text,
  "scopes" text[],
  "access_token_ciphertext" text,
  "refresh_token_ciphertext" text,
  "token_expires_at" timestamptz,
  "imap_settings" jsonb,
  "status" "crm"."mailbox_status" DEFAULT 'connecting' NOT NULL,
  "status_reason" text,
  "sync_mode" "crm"."mailbox_sync_mode" DEFAULT 'push' NOT NULL,
  "daily_send_limit" integer DEFAULT 400 NOT NULL,
  "sent_today" integer DEFAULT 0 NOT NULL,
  "last_synced_at" timestamptz,
  "connected_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);
ALTER TABLE "crm"."mailbox_connection" ADD CONSTRAINT "mailbox_connection_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE CASCADE;
ALTER TABLE "crm"."mailbox_connection" ADD CONSTRAINT "mailbox_connection_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "crm"."user"("id") ON DELETE CASCADE;
CREATE INDEX "crm_mailbox_connection_org_user" ON "crm"."mailbox_connection" ("org_id", "user_id");
CREATE UNIQUE INDEX "crm_mailbox_personal_user"
  ON "crm"."mailbox_connection" ("org_id", "user_id") WHERE "kind" = 'personal';

CREATE TABLE "crm"."mailbox_sync_state" (
  "mailbox_id" uuid PRIMARY KEY NOT NULL,
  "org_id" uuid NOT NULL,
  "gmail_history_id" text,
  "gmail_watch_expires_at" timestamptz,
  "graph_delta_link" text,
  "graph_subscription_id" text,
  "graph_subscription_expires_at" timestamptz,
  "imap_uidvalidity" text,
  "imap_last_uid" text,
  "backfill_from" timestamptz,
  "backfill_status" text
);
ALTER TABLE "crm"."mailbox_sync_state" ADD CONSTRAINT "mailbox_sync_state_mailbox_fk"
  FOREIGN KEY ("mailbox_id") REFERENCES "crm"."mailbox_connection"("id") ON DELETE CASCADE;

CREATE TABLE "crm"."phone_number" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "connection_id" uuid NOT NULL,
  "e164" text NOT NULL,
  "type" text NOT NULL,
  "capabilities" jsonb DEFAULT '{"voice":true,"sms":false}'::jsonb NOT NULL,
  "source" text DEFAULT 'purchased' NOT NULL,
  "provider_sid" text,
  "assigned_user_id" uuid,
  "is_default_for_sms" boolean DEFAULT false NOT NULL,
  "is_default_for_voice" boolean DEFAULT false NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "monthly_cost_pence" integer,
  "purchased_at" timestamptz,
  "release_at" timestamptz,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "crm"."phone_number" ADD CONSTRAINT "phone_number_connection_fk"
  FOREIGN KEY ("connection_id") REFERENCES "crm"."channel_connection"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX "crm_phone_number_org_e164" ON "crm"."phone_number" ("org_id", "e164");

CREATE TABLE "crm"."regulatory_profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "legal_name" text NOT NULL,
  "company_number" text,
  "address" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "contact_name" text,
  "contact_email" text,
  "provider_bundle_sid" text,
  "provider_end_user_sid" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "rejection_reason" text,
  "documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "crm_regulatory_profile_org" ON "crm"."regulatory_profile" ("org_id");

CREATE TABLE "crm"."usage_record" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "connection_id" uuid,
  "channel" "crm"."channel_kind" NOT NULL,
  "unit" text NOT NULL,
  "quantity" integer NOT NULL,
  "cost_pence" bigint,
  "price_pence" bigint,
  "direction" text,
  "occurred_at" timestamptz NOT NULL,
  "provider_reference" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "crm_usage_record_provider_ref" ON "crm"."usage_record" ("provider_reference");

CREATE TABLE "crm"."spend_limit" (
  "org_id" uuid PRIMARY KEY NOT NULL,
  "monthly_limit_pence" bigint NOT NULL,
  "alert_at_percent" integer DEFAULT 80 NOT NULL,
  "pause_at_percent" integer DEFAULT 100 NOT NULL,
  "paused_at" timestamptz,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "crm"."spend_limit" ADD CONSTRAINT "spend_limit_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE CASCADE;

CREATE TABLE "crm"."channel_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "connection_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid
);
ALTER TABLE "crm"."channel_event" ADD CONSTRAINT "channel_event_connection_fk"
  FOREIGN KEY ("connection_id") REFERENCES "crm"."channel_connection"("id") ON DELETE CASCADE;
CREATE INDEX "crm_channel_event_connection" ON "crm"."channel_event" ("connection_id", "created_at" DESC);

-- RLS
ALTER TABLE "crm"."channel_connection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."channel_connection" FORCE ROW LEVEL SECURITY;
CREATE POLICY channel_connection_tenant ON "crm"."channel_connection"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."mailbox_connection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."mailbox_connection" FORCE ROW LEVEL SECURITY;
CREATE POLICY mailbox_connection_tenant ON "crm"."mailbox_connection"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."mailbox_sync_state" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."mailbox_sync_state" FORCE ROW LEVEL SECURITY;
CREATE POLICY mailbox_sync_state_tenant ON "crm"."mailbox_sync_state"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."phone_number" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."phone_number" FORCE ROW LEVEL SECURITY;
CREATE POLICY phone_number_tenant ON "crm"."phone_number"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."regulatory_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."regulatory_profile" FORCE ROW LEVEL SECURITY;
CREATE POLICY regulatory_profile_tenant ON "crm"."regulatory_profile"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."usage_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."usage_record" FORCE ROW LEVEL SECURITY;
CREATE POLICY usage_record_tenant ON "crm"."usage_record"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."spend_limit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."spend_limit" FORCE ROW LEVEL SECURITY;
CREATE POLICY spend_limit_tenant ON "crm"."spend_limit"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."channel_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."channel_event" FORCE ROW LEVEL SECURITY;
CREATE POLICY channel_event_tenant ON "crm"."channel_event"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."channel_connection" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."mailbox_connection" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."mailbox_sync_state" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."phone_number" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."regulatory_profile" TO crm_app;
GRANT SELECT, INSERT ON "crm"."usage_record" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."spend_limit" TO crm_app;
GRANT SELECT, INSERT ON "crm"."channel_event" TO crm_app;
