ALTER TABLE "crm"."user" ADD COLUMN IF NOT EXISTS "google_sub" text;
ALTER TABLE "crm"."user" ADD COLUMN IF NOT EXISTS "microsoft_sub" text;

CREATE UNIQUE INDEX IF NOT EXISTS "crm_user_google_sub_unique"
  ON "crm"."user" ("google_sub");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_user_microsoft_sub_unique"
  ON "crm"."user" ("microsoft_sub");
