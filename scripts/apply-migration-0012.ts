import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL or DATABASE_MIGRATION_URL required');
  }

  const sql = postgres(url, { max: 1, prepare: false });

  const exists = await sql`
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'crm'
        and table_name = 'organisation_settings'
        and column_name = 'auto_link_contacts_by_email_domain'
    ) as ok
  `;

  if (exists[0]?.ok) {
    console.log('0012 already applied (auto_link_contacts_by_email_domain exists).');
    await sql.end();
    return;
  }

  const migrationSql = readFileSync(
    'src/server/db/migrations/0012_org_auto_link_contacts.sql',
    'utf8',
  );

  await sql.unsafe(migrationSql);

  console.log('Applied 0012_org_auto_link_contacts.sql');
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
