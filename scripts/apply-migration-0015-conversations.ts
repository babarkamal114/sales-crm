import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });
config({ path: '.env' });

/** Neon dev often has no crm_app role; GRANT lines are for production app user. */
function stripGrants(sqlText: string): string {
  return sqlText
    .split('\n')
    .filter((line) => !/^\s*GRANT\s/i.test(line))
    .join('\n');
}

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL or DATABASE_MIGRATION_URL required');
  }

  const sql = postgres(url, { max: 1, prepare: false });

  const exists = await sql`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'crm' and table_name = 'conversation'
    ) as ok
  `;

  if (exists[0]?.ok) {
    console.log('0015 already applied (conversation exists).');
  } else {
    const migrationSql = stripGrants(
      readFileSync('src/server/db/migrations/0015_conversations_f4.sql', 'utf8'),
    );
    await sql.unsafe(migrationSql);
    console.log('Applied 0015_conversations_f4.sql');
  }

  const outboxExists = await sql`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'crm' and table_name = 'outbox_event'
    ) as ok
  `;

  if (outboxExists[0]?.ok) {
    console.log('0016 already applied (outbox_event exists).');
  } else {
    const migrationSql = stripGrants(
      readFileSync('src/server/db/migrations/0016_outbox_event.sql', 'utf8'),
    );
    await sql.unsafe(migrationSql);
    console.log('Applied 0016_outbox_event.sql');
  }

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
