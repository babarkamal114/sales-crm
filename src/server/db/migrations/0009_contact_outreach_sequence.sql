CREATE TABLE "crm"."contact_outreach_sequence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "sequence_key" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "current_step_index" integer DEFAULT 0 NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_sent_at" timestamp with time zone,
  "next_due_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "crm"."contact_outreach_sequence"
  ADD CONSTRAINT "contact_outreach_sequence_org_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_outreach_sequence"
  ADD CONSTRAINT "contact_outreach_sequence_contact_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;

CREATE UNIQUE INDEX "crm_contact_outreach_sequence_active"
  ON "crm"."contact_outreach_sequence" ("org_id", "contact_id", "sequence_key")
  WHERE "status" = 'active';

CREATE INDEX "crm_contact_outreach_sequence_org_due"
  ON "crm"."contact_outreach_sequence" ("org_id", "next_due_at")
  WHERE "status" = 'active';

ALTER TABLE "crm"."contact_outreach_sequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_outreach_sequence" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_outreach_sequence_tenant ON "crm"."contact_outreach_sequence"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
