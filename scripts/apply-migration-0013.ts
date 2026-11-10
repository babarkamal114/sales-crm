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
        and table_name = 'contact'
        and column_name = 'address_line1'
    ) as ok
  `;

  if (exists[0]?.ok) {
    console.log('0013 already applied (contact.address_line1 exists).');
    await sql.end();
    return;
  }

  const migrationSql = readFileSync(
    'src/server/db/migrations/0013_contact_profile_fields.sql',
    'utf8',
  );

  await sql.unsafe(migrationSql);

  console.log('Applied 0013_contact_profile_fields.sql');
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
