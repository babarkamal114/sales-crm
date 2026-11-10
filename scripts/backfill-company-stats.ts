import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');

  const sql = postgres(url, { max: 1, prepare: false });

  await sql`
    update crm.company_stats cs
    set
      contact_count = sub.cnt,
      open_deal_count = sub.open_cnt,
      open_pipeline_value = sub.open_val,
      won_value_total = sub.won_val,
      updated_at = now()
    from (
      select
        c.id as company_id,
        count(distinct ct.id) filter (where ct.deleted_at is null)::int as cnt,
        count(distinct o.id) filter (where o.deleted_at is null and o.status = 'open')::int as open_cnt,
        coalesce(sum(o.value_pence) filter (where o.deleted_at is null and o.status = 'open'), 0)::bigint as open_val,
        coalesce(sum(o.value_pence) filter (where o.deleted_at is null and o.status = 'won'), 0)::bigint as won_val
      from crm.company c
      left join crm.contact ct on ct.company_id = c.id and ct.org_id = c.org_id
      left join crm.opportunity o on o.org_id = c.org_id
        and o.deleted_at is null
        and (o.company_id = c.id or o.contact_id = ct.id)
      where c.deleted_at is null
      group by c.id
    ) sub
    where cs.company_id = sub.company_id
  `;

  console.log('Backfilled company_stats from contacts and opportunities.');
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
