CREATE TABLE "crm"."outbox_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "dispatched_at" timestamp with time zone
);

ALTER TABLE "crm"."outbox_event"
  ADD CONSTRAINT "outbox_event_org_fk"
  FOREIGN KEY ("org_id") REFERENCES "crm"."organisation"("id") ON DELETE cascade;

CREATE INDEX "crm_outbox_pending"
  ON "crm"."outbox_event" ("org_id", "created_at")
  WHERE "dispatched_at" IS NULL;

ALTER TABLE "crm"."outbox_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm"."outbox_event" FORCE ROW LEVEL SECURITY;
CREATE POLICY outbox_event_tenant ON "crm"."outbox_event"
  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE ON "crm"."outbox_event" TO crm_app;
