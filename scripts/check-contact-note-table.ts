import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const pairs: [string, string | undefined][] = [
    ['MIGRATION', process.env.DATABASE_MIGRATION_URL],
    ['APP', process.env.DATABASE_URL],
  ];

  for (const [label, url] of pairs) {
    if (!url) {
      console.log(`${label}: (no URL)`);
      continue;
    }
    const sql = postgres(url, { max: 1, prepare: false });
    try {
      const mig = await sql`
        select id, hash, created_at
        from crm.__crm_migrations
        order by created_at desc
        limit 8
      `;
      const tbl = await sql`
        select exists (
          select 1 from information_schema.tables
          where table_schema = 'crm' and table_name = 'contact_note'
        ) as ok
      `;
      console.log(`\n--- ${label} ---`);
      console.log('contact_note exists:', tbl[0]?.ok);
      console.log(
        'migrations:',
        mig.map((r) => ({ id: r.id, hash: String(r.hash).slice(0, 12) })),
      );
    } catch (error) {
      console.log(`\n--- ${label} ERROR ---`, error instanceof Error ? error.message : error);
    } finally {
      await sql.end();
    }
  }
}

main().catch(console.error);
