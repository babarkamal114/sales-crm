CREATE TABLE "crm"."contact_note" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "body" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "crm"."contact_note"
  ADD CONSTRAINT "contact_note_org_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_note"
  ADD CONSTRAINT "contact_note_contact_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_note"
  ADD CONSTRAINT "contact_note_created_by_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id");

ALTER TABLE "crm"."contact_note"
  ADD CONSTRAINT "contact_note_updated_by_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id");

CREATE INDEX "crm_contact_note_org_contact"
  ON "crm"."contact_note" ("org_id", "contact_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE "crm"."contact_task" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "title" text NOT NULL,
  "kind" text DEFAULT 'follow_up' NOT NULL,
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

ALTER TABLE "crm"."contact_task"
  ADD CONSTRAINT "contact_task_org_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_task"
  ADD CONSTRAINT "contact_task_contact_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "crm"."contact"("id") ON DELETE cascade;

ALTER TABLE "crm"."contact_task"
  ADD CONSTRAINT "contact_task_assignee_id_fk"
  FOREIGN KEY ("assignee_id") REFERENCES "crm"."user"("id") ON DELETE set null;

ALTER TABLE "crm"."contact_task"
  ADD CONSTRAINT "contact_task_completed_by_fk"
  FOREIGN KEY ("completed_by") REFERENCES "crm"."user"("id") ON DELETE set null;

ALTER TABLE "crm"."contact_task"
  ADD CONSTRAINT "contact_task_created_by_fk"
  FOREIGN KEY ("created_by") REFERENCES "crm"."user"("id");

ALTER TABLE "crm"."contact_task"
  ADD CONSTRAINT "contact_task_updated_by_fk"
  FOREIGN KEY ("updated_by") REFERENCES "crm"."user"("id");

CREATE INDEX "crm_contact_task_org_contact_open"
  ON "crm"."contact_task" ("org_id", "contact_id")
  WHERE "deleted_at" IS NULL AND "completed_at" IS NULL;

CREATE INDEX "crm_contact_task_org_assignee_open"
  ON "crm"."contact_task" ("org_id", "assignee_id")
  WHERE "deleted_at" IS NULL AND "completed_at" IS NULL;

ALTER TABLE "crm"."contact_note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_note" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_note_tenant ON "crm"."contact_note"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE "crm"."contact_task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."contact_task" FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_task_tenant ON "crm"."contact_task"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
