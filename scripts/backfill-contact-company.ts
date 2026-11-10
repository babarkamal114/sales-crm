import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');

  const sql = postgres(url, { max: 1, prepare: false });

  await sql`
    insert into crm.contact_company (org_id, contact_id, company_id, is_primary, created_at)
    select c.org_id, c.id, c.company_id, true, now()
    from crm.contact c
    where c.company_id is not null
      and c.deleted_at is null
      and not exists (
        select 1 from crm.contact_company cc
        where cc.contact_id = c.id and cc.company_id = c.company_id
      )
  `;

  console.log('Backfilled crm.contact_company from contact.company_id');
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
