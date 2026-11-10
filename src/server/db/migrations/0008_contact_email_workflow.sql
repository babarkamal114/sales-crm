CREATE TABLE "crm"."contact_email_template" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "step_key" text NOT NULL,
  "name" text NOT NULL,
  "subject" text NOT NULL,
  "body_html" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "crm"."contact_email_template"
  ADD CONSTRAINT "contact_email_template_org_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_email_template"
  ADD CONSTRAINT "contact_email_template_created_by_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id");

ALTER TABLE "crm"."contact_email_template"
  ADD CONSTRAINT "contact_email_template_updated_by_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id");

CREATE UNIQUE INDEX "crm_contact_email_template_org_step"
  ON "crm"."contact_email_template" ("org_id", "step_key")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "crm_contact_email_template_org_sort"
  ON "crm"."contact_email_template" ("org_id", "sort_order")
  WHERE "deleted_at" IS NULL;

CREATE TABLE "crm"."contact_email_send" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "template_id" uuid,
  "step_key" text,
  "to_address" text NOT NULL,
  "subject" text NOT NULL,
  "body_html" text NOT NULL,
  "status" text DEFAULT 'sent' NOT NULL,
  "error_message" text,
  "provider_message_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL
);

ALTER TABLE "crm"."contact_email_send"
  ADD CONSTRAINT "contact_email_send_org_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_email_send"
  ADD CONSTRAINT "contact_email_send_contact_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_email_send"
  ADD CONSTRAINT "contact_email_send_template_id_fk"
  FOREIGN KEY ("template_id") REFERENCES "crm"."contact_email_template"("id") ON DELETE set null;

ALTER TABLE "crm"."contact_email_send"
  ADD CONSTRAINT "contact_email_send_created_by_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id");

CREATE INDEX "crm_contact_email_send_org_contact"
  ON "crm"."contact_email_send" ("org_id", "contact_id", "created_at" DESC);

ALTER TABLE "crm"."contact_email_template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_email_template" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_email_template_tenant ON "crm"."contact_email_template"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."contact_email_send" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_email_send" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_email_send_tenant ON "crm"."contact_email_send"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
