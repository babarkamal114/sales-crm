ALTER TABLE "crm"."organisation_settings"
  ADD COLUMN IF NOT EXISTS "auto_link_contacts_by_email_domain" boolean NOT NULL DEFAULT true;
