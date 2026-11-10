ALTER TABLE "crm"."contact"
  ADD COLUMN IF NOT EXISTS "address_line1" text,
  ADD COLUMN IF NOT EXISTS "address_line2" text,
  ADD COLUMN IF NOT EXISTS "city" text,
  ADD COLUMN IF NOT EXISTS "postcode" text,
  ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'GB',
  ADD COLUMN IF NOT EXISTS "secondary_email" text,
  ADD COLUMN IF NOT EXISTS "secondary_email_normalised" text,
  ADD COLUMN IF NOT EXISTS "secondary_phone_e164" text,
  ADD COLUMN IF NOT EXISTS "date_of_birth" date;

ALTER TABLE "crm"."organisation_settings"
  ADD COLUMN IF NOT EXISTS "collect_contact_date_of_birth" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "crm_contact_org_secondary_email"
  ON "crm"."contact" ("org_id", "secondary_email_normalised")
  WHERE "deleted_at" IS NULL AND "secondary_email_normalised" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "crm_contact_org_secondary_phone"
  ON "crm"."contact" ("org_id", "secondary_phone_e164")
  WHERE "deleted_at" IS NULL AND "secondary_phone_e164" IS NOT NULL;
