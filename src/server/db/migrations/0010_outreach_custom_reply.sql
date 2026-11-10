CREATE TABLE "crm"."org_outreach_sequence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "sequence_key" text NOT NULL,
  "label" text NOT NULL,
  "steps" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."org_outreach_sequence"
  ADD CONSTRAINT "org_outreach_sequence_org_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

CREATE UNIQUE INDEX "crm_org_outreach_sequence_org_key"
  ON "crm"."org_outreach_sequence" ("org_id", "sequence_key");

ALTER TABLE "crm"."contact_outreach_sequence"
  ADD COLUMN IF NOT EXISTS "scheduled_start_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "pause_reason" text,
  ADD COLUMN IF NOT EXISTS "replied_at" timestamp with time zone;

ALTER TABLE "crm"."contact_email_send"
  ADD COLUMN IF NOT EXISTS "provider_thread_id" text;

CREATE TABLE "crm"."contact_email_reply_draft" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "gmail_message_id" text NOT NULL,
  "inbound_from" text,
  "inbound_subject" text,
  "inbound_preview" text NOT NULL,
  "draft_subject" text NOT NULL,
  "draft_html" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL
);

ALTER TABLE "crm"."contact_email_reply_draft"
  ADD CONSTRAINT "contact_email_reply_draft_org_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_email_reply_draft"
  ADD CONSTRAINT "contact_email_reply_draft_contact_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_email_reply_draft"
  ADD CONSTRAINT "contact_email_reply_draft_updated_by_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id");

CREATE UNIQUE INDEX "crm_contact_email_reply_draft_gmail"
  ON "crm"."contact_email_reply_draft" ("org_id", "gmail_message_id");

CREATE INDEX "crm_contact_email_reply_draft_contact_pending"
  ON "crm"."contact_email_reply_draft" ("org_id", "contact_id", "status")
  WHERE "status" = 'pending';

CREATE TABLE "crm"."org_user_notification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "href" text,
  "contact_id" uuid,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."org_user_notification"
  ADD CONSTRAINT "org_user_notification_org_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."org_user_notification"
  ADD CONSTRAINT "org_user_notification_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "crm"."user"("id") ON DELETE cascade;

ALTER TABLE "crm"."org_user_notification"
  ADD CONSTRAINT "org_user_notification_contact_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE set null;

CREATE INDEX "crm_org_user_notification_user_unread"
  ON "crm"."org_user_notification" ("org_id", "user_id", "created_at")
  WHERE "read_at" IS NULL;

ALTER TABLE "crm"."org_outreach_sequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."org_outreach_sequence" FORCE ROW LEVEL SECURITY;
CREATE POLICY org_outreach_sequence_tenant ON "crm"."org_outreach_sequence"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."contact_email_reply_draft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_email_reply_draft" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_email_reply_draft_tenant ON "crm"."contact_email_reply_draft"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."org_user_notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."org_user_notification" FORCE ROW LEVEL SECURITY;
CREATE POLICY org_user_notification_tenant ON "crm"."org_user_notification"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
