CREATE TABLE "crm"."opportunity_note" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "opportunity_id" uuid NOT NULL,
  "body" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "crm"."opportunity_note"
  ADD CONSTRAINT "opportunity_note_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity_note"
  ADD CONSTRAINT "opportunity_note_contact_id_contact_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity_note"
  ADD CONSTRAINT "opportunity_note_opportunity_id_opportunity_id_fk"
  FOREIGN KEY ("opportunity_id") REFERENCES "crm"."opportunity"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity_note"
  ADD CONSTRAINT "opportunity_note_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "crm"."opportunity_note"
  ADD CONSTRAINT "opportunity_note_updated_by_user_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

CREATE INDEX "crm_opportunity_note_org_opportunity"
  ON "crm"."opportunity_note" ("org_id", "opportunity_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE "crm"."opportunity_task" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "opportunity_id" uuid NOT NULL,
  "title" text NOT NULL,
  "assignee_id" uuid,
  "due_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "completed_by" uuid,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "crm"."opportunity_task"
  ADD CONSTRAINT "opportunity_task_org_id_organisation_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity_task"
  ADD CONSTRAINT "opportunity_task_contact_id_contact_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity_task"
  ADD CONSTRAINT "opportunity_task_opportunity_id_opportunity_id_fk"
  FOREIGN KEY ("opportunity_id") REFERENCES "crm"."opportunity"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "crm"."opportunity_task"
  ADD CONSTRAINT "opportunity_task_assignee_id_user_id_fk"
  FOREIGN KEY ("assignee_id") REFERENCES "crm"."user"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "crm"."opportunity_task"
  ADD CONSTRAINT "opportunity_task_completed_by_user_id_fk"
  FOREIGN KEY ("completed_by") REFERENCES "crm"."user"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "crm"."opportunity_task"
  ADD CONSTRAINT "opportunity_task_created_by_user_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "crm"."opportunity_task"
  ADD CONSTRAINT "opportunity_task_updated_by_user_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id")
  ON DELETE no action ON UPDATE no action;

CREATE INDEX "crm_opportunity_task_org_opportunity"
  ON "crm"."opportunity_task" ("org_id", "opportunity_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "crm_opportunity_task_org_assignee_open"
  ON "crm"."opportunity_task" ("org_id", "assignee_id")
  WHERE "deleted_at" IS NULL AND "completed_at" IS NULL;

ALTER TABLE "crm"."opportunity_note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."opportunity_note" FORCE ROW LEVEL SECURITY;
CREATE POLICY opportunity_note_tenant ON "crm"."opportunity_note"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."opportunity_task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."opportunity_task" FORCE ROW LEVEL SECURITY;
CREATE POLICY opportunity_task_tenant ON "crm"."opportunity_task"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
