import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });
config({ path: '.env' });

function stripGrants(sqlText: string): string {
  return sqlText
    .split('\n')
    .filter((line) => !/^\s*GRANT\s/i.test(line))
    .join('\n');
}

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const sql = postgres(url, { max: 1, prepare: false });
  const path = `${__dirname}/../src/server/db/migrations/0018_channels_f1_extras.sql`;
  await sql.unsafe(stripGrants(readFileSync(path, 'utf8')));
  await sql.end();
  console.log('Applied 0018_channels_f1_extras');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
