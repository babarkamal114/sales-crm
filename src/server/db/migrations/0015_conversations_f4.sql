-- F4 Conversations: unified inbox schema (Phase 1)

CREATE TYPE "crm"."conversation_status" AS ENUM('open', 'snoozed', 'closed');
CREATE TYPE "crm"."message_channel" AS ENUM('email', 'sms', 'whatsapp');
CREATE TYPE "crm"."message_direction" AS ENUM('inbound', 'outbound');
CREATE TYPE "crm"."message_purpose" AS ENUM('conversation', 'marketing');
CREATE TYPE "crm"."message_status" AS ENUM(
  'scheduled', 'queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'bounced'
);
CREATE TYPE "crm"."attachment_scan_status" AS ENUM('pending', 'clean', 'blocked');
CREATE TYPE "crm"."whatsapp_template_status" AS ENUM('pending', 'approved', 'rejected');
CREATE TYPE "crm"."phone_call_direction" AS ENUM('inbound', 'outbound');
CREATE TYPE "crm"."phone_call_status" AS ENUM('ringing', 'in_progress', 'completed', 'missed', 'failed');

CREATE TABLE "crm"."conversation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "status" "crm"."conversation_status" DEFAULT 'open' NOT NULL,
  "assignee_id" uuid,
  "snoozed_until" timestamp with time zone,
  "last_message_at" timestamp with time zone,
  "last_inbound_at" timestamp with time zone,
  "last_outbound_at" timestamp with time zone,
  "waiting_since" timestamp with time zone,
  "last_channel" "crm"."message_channel",
  "wa_window_expires_at" timestamp with time zone,
  "reply_token" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

ALTER TABLE "crm"."conversation"
  ADD CONSTRAINT "conversation_org_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;
ALTER TABLE "crm"."conversation"
  ADD CONSTRAINT "conversation_contact_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;
ALTER TABLE "crm"."conversation"
  ADD CONSTRAINT "conversation_assignee_id_fk"
  FOREIGN KEY ("assignee_id") REFERENCES "crm"."user"("id") ON DELETE set null;
ALTER TABLE "crm"."conversation"
  ADD CONSTRAINT "conversation_created_by_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id");
ALTER TABLE "crm"."conversation"
  ADD CONSTRAINT "conversation_updated_by_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id");

CREATE UNIQUE INDEX "crm_conversation_org_contact" ON "crm"."conversation" ("org_id", "contact_id");
CREATE UNIQUE INDEX "crm_conversation_reply_token" ON "crm"."conversation" ("reply_token");
CREATE INDEX "crm_conversation_inbox"
  ON "crm"."conversation" ("org_id", "status", "assignee_id", "last_message_at" DESC, "id");
CREATE INDEX "crm_conversation_waiting"
  ON "crm"."conversation" ("org_id", "status", "waiting_since");

CREATE TABLE "crm"."message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "conversation_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "channel" "crm"."message_channel" NOT NULL,
  "direction" "crm"."message_direction" NOT NULL,
  "purpose" "crm"."message_purpose" DEFAULT 'conversation' NOT NULL,
  "subject" text,
  "body_text" text,
  "body_html" text,
  "preview" text,
  "from_address" text,
  "to_address" text,
  "cc" text[],
  "provider" text,
  "provider_message_id" text,
  "status" "crm"."message_status" DEFAULT 'queued' NOT NULL,
  "error_code" text,
  "error_message" text,
  "sent_by_user_id" uuid,
  "template_id" uuid,
  "client_id" uuid,
  "scheduled_at" timestamp with time zone,
  "segments" integer,
  "email_message_id" text,
  "in_reply_to" text,
  "references" text[],
  "search_vector" tsvector,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."message"
  ADD CONSTRAINT "message_org_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;
ALTER TABLE "crm"."message"
  ADD CONSTRAINT "message_conversation_id_fk"
  FOREIGN KEY ("conversation_id") REFERENCES "crm"."conversation"("id") ON DELETE cascade;
ALTER TABLE "crm"."message"
  ADD CONSTRAINT "message_contact_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;
ALTER TABLE "crm"."message"
  ADD CONSTRAINT "message_sent_by_user_id_fk"
  FOREIGN KEY ("sent_by_user_id") REFERENCES "crm"."user"("id") ON DELETE set null;

CREATE UNIQUE INDEX "crm_message_provider_id"
  ON "crm"."message" ("provider", "provider_message_id")
  WHERE "provider_message_id" IS NOT NULL;
CREATE UNIQUE INDEX "crm_message_org_client_id"
  ON "crm"."message" ("org_id", "client_id")
  WHERE "client_id" IS NOT NULL;
CREATE INDEX "crm_message_conversation_timeline"
  ON "crm"."message" ("conversation_id", "created_at", "id");
CREATE INDEX "crm_message_search"
  ON "crm"."message" USING gin ("search_vector");

CREATE TABLE "crm"."message_status_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "message_id" uuid NOT NULL,
  "status" "crm"."message_status" NOT NULL,
  "provider_payload_hash" text,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."message_status_event"
  ADD CONSTRAINT "message_status_event_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;
ALTER TABLE "crm"."message_status_event"
  ADD CONSTRAINT "message_status_event_message_fk"
  FOREIGN KEY ("message_id") REFERENCES "crm"."message"("id") ON DELETE cascade;

CREATE INDEX "crm_message_status_event_message"
  ON "crm"."message_status_event" ("message_id", "occurred_at");

CREATE TABLE "crm"."message_attachment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "message_id" uuid NOT NULL,
  "r2_key" text NOT NULL,
  "filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "size" integer NOT NULL,
  "scan_status" "crm"."attachment_scan_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."message_attachment"
  ADD CONSTRAINT "message_attachment_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;
ALTER TABLE "crm"."message_attachment"
  ADD CONSTRAINT "message_attachment_message_fk"
  FOREIGN KEY ("message_id") REFERENCES "crm"."message"("id") ON DELETE cascade;

CREATE TABLE "crm"."conversation_comment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "conversation_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "body" text NOT NULL,
  "edited_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."conversation_comment"
  ADD CONSTRAINT "conversation_comment_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;
ALTER TABLE "crm"."conversation_comment"
  ADD CONSTRAINT "conversation_comment_conversation_fk"
  FOREIGN KEY ("conversation_id") REFERENCES "crm"."conversation"("id") ON DELETE cascade;
ALTER TABLE "crm"."conversation_comment"
  ADD CONSTRAINT "conversation_comment_author_fk"
  FOREIGN KEY ("author_id") REFERENCES "crm"."user"("id");

CREATE TABLE "crm"."comment_mention" (
  "comment_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "org_id" uuid NOT NULL,
  PRIMARY KEY ("comment_id", "user_id")
);

ALTER TABLE "crm"."comment_mention"
  ADD CONSTRAINT "comment_mention_comment_fk"
  FOREIGN KEY ("comment_id") REFERENCES "crm"."conversation_comment"("id") ON DELETE cascade;
ALTER TABLE "crm"."comment_mention"
  ADD CONSTRAINT "comment_mention_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "crm"."user"("id") ON DELETE cascade;
ALTER TABLE "crm"."comment_mention"
  ADD CONSTRAINT "comment_mention_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

CREATE TABLE "crm"."conversation_read" (
  "conversation_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "org_id" uuid NOT NULL,
  "last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("conversation_id", "user_id")
);

ALTER TABLE "crm"."conversation_read"
  ADD CONSTRAINT "conversation_read_conversation_fk"
  FOREIGN KEY ("conversation_id") REFERENCES "crm"."conversation"("id") ON DELETE cascade;
ALTER TABLE "crm"."conversation_read"
  ADD CONSTRAINT "conversation_read_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "crm"."user"("id") ON DELETE cascade;
ALTER TABLE "crm"."conversation_read"
  ADD CONSTRAINT "conversation_read_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

CREATE INDEX "crm_conversation_read_user"
  ON "crm"."conversation_read" ("user_id", "conversation_id");

CREATE TABLE "crm"."message_template" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "channel" "crm"."message_channel" NOT NULL,
  "name" text NOT NULL,
  "body" text NOT NULL,
  "subject" text,
  "category" text,
  "whatsapp_template_name" text,
  "whatsapp_status" "crm"."whatsapp_template_status",
  "language" text DEFAULT 'en_GB' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."message_template"
  ADD CONSTRAINT "message_template_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

CREATE TABLE "crm"."snippet" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "owner_id" uuid,
  "shortcut" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."snippet"
  ADD CONSTRAINT "snippet_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;
ALTER TABLE "crm"."snippet"
  ADD CONSTRAINT "snippet_owner_fk"
  FOREIGN KEY ("owner_id") REFERENCES "crm"."user"("id") ON DELETE cascade;

CREATE UNIQUE INDEX "crm_snippet_org_shortcut"
  ON "crm"."snippet" ("org_id", "shortcut")
  WHERE "owner_id" IS NULL;
CREATE UNIQUE INDEX "crm_snippet_owner_shortcut"
  ON "crm"."snippet" ("org_id", "owner_id", "shortcut")
  WHERE "owner_id" IS NOT NULL;

CREATE TABLE "crm"."phone_call" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "conversation_id" uuid,
  "direction" "crm"."phone_call_direction" NOT NULL,
  "status" "crm"."phone_call_status" NOT NULL,
  "duration_seconds" integer,
  "recording_r2_key" text,
  "provider" text,
  "provider_call_id" text,
  "handled_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."phone_call"
  ADD CONSTRAINT "phone_call_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;
ALTER TABLE "crm"."phone_call"
  ADD CONSTRAINT "phone_call_contact_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;
ALTER TABLE "crm"."phone_call"
  ADD CONSTRAINT "phone_call_conversation_fk"
  FOREIGN KEY ("conversation_id") REFERENCES "crm"."conversation"("id") ON DELETE set null;
ALTER TABLE "crm"."phone_call"
  ADD CONSTRAINT "phone_call_user_fk"
  FOREIGN KEY ("handled_by_user_id") REFERENCES "crm"."user"("id") ON DELETE set null;

CREATE INDEX "crm_phone_call_conversation"
  ON "crm"."phone_call" ("conversation_id", "created_at");

CREATE TABLE "crm"."activity_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "opportunity_id" uuid,
  "conversation_id" uuid,
  "message_id" uuid,
  "type" text NOT NULL,
  "actor_type" "crm"."audit_actor_type" NOT NULL,
  "actor_id" text NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE "crm"."activity_event"
  ADD CONSTRAINT "activity_event_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;
ALTER TABLE "crm"."activity_event"
  ADD CONSTRAINT "activity_event_contact_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;
ALTER TABLE "crm"."activity_event"
  ADD CONSTRAINT "activity_event_conversation_fk"
  FOREIGN KEY ("conversation_id") REFERENCES "crm"."conversation"("id") ON DELETE set null;
ALTER TABLE "crm"."activity_event"
  ADD CONSTRAINT "activity_event_message_fk"
  FOREIGN KEY ("message_id") REFERENCES "crm"."message"("id") ON DELETE set null;

CREATE INDEX "crm_activity_event_contact"
  ON "crm"."activity_event" ("org_id", "contact_id", "occurred_at" DESC, "id");

-- RLS (tenant isolation)
ALTER TABLE "crm"."conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."conversation" FORCE ROW LEVEL SECURITY;
CREATE POLICY conversation_tenant ON "crm"."conversation"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."message" FORCE ROW LEVEL SECURITY;
CREATE POLICY message_tenant ON "crm"."message"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."message_status_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."message_status_event" FORCE ROW LEVEL SECURITY;
CREATE POLICY message_status_event_tenant ON "crm"."message_status_event"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."message_attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."message_attachment" FORCE ROW LEVEL SECURITY;
CREATE POLICY message_attachment_tenant ON "crm"."message_attachment"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."conversation_comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."conversation_comment" FORCE ROW LEVEL SECURITY;
CREATE POLICY conversation_comment_tenant ON "crm"."conversation_comment"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."comment_mention" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."comment_mention" FORCE ROW LEVEL SECURITY;
CREATE POLICY comment_mention_tenant ON "crm"."comment_mention"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."conversation_read" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."conversation_read" FORCE ROW LEVEL SECURITY;
CREATE POLICY conversation_read_tenant ON "crm"."conversation_read"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."message_template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."message_template" FORCE ROW LEVEL SECURITY;
CREATE POLICY message_template_tenant ON "crm"."message_template"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."snippet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."snippet" FORCE ROW LEVEL SECURITY;
CREATE POLICY snippet_tenant ON "crm"."snippet"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."phone_call" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."phone_call" FORCE ROW LEVEL SECURITY;
CREATE POLICY phone_call_tenant ON "crm"."phone_call"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."activity_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."activity_event" FORCE ROW LEVEL SECURITY;
CREATE POLICY activity_event_tenant ON "crm"."activity_event"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."conversation" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."message" TO crm_app;
GRANT SELECT, INSERT ON "crm"."message_status_event" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."message_attachment" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."conversation_comment" TO crm_app;
GRANT SELECT, INSERT, DELETE ON "crm"."comment_mention" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."conversation_read" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."message_template" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."snippet" TO crm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "crm"."phone_call" TO crm_app;
GRANT SELECT, INSERT ON "crm"."activity_event" TO crm_app;
