/**
 * Times contacts list + summary queries against the configured database (rule 09 / C12).
 *
 * Usage:
 *   pnpm exec tsx --conditions=react-server scripts/contacts-query-performance.ts
 *
 * For meaningful C12 numbers, seed a large org first (`pnpm db:seed:large` when available).
 */
import { config } from 'dotenv';
import { count, eq } from 'drizzle-orm';
import { getDb } from '../src/server/db/client';
import { contact, membership } from '../src/server/db/schema';
import { getContactListSummary, listContacts } from '../src/server/services/contacts/list-contacts';
import { setTenantContext } from '../src/test/db/tenant-context';

config({ path: '.env.local' });
config({ path: '.env' });

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

async function main() {
  const db = getDb();
  const [member] = await db.select().from(membership).where(eq(membership.role, 'admin')).limit(1);
  if (!member) {
    console.error('No admin membership found. Sign up or run db:seed-admin.');
    process.exit(1);
  }

  const session = {
    orgId: member.orgId,
    userId: member.userId,
    role: member.role as 'admin',
  };

  await db.transaction(async (tx) => {
    await setTenantContext(tx, session);

    const [totalRow] = await tx
      .select({ n: count() })
      .from(contact)
      .where(eq(contact.orgId, session.orgId));
    const totalContacts = Number(totalRow?.n ?? 0);
    console.log(`Organisation ${session.orgId}: ${totalContacts.toLocaleString()} contacts`);

    if (totalContacts < 1_000) {
      console.warn(
        'Fewer than 1,000 contacts — C12 budget check is indicative only. Use db:seed:large for load testing.',
      );
    }

    const listQuery = {
      list: 'all' as const,
      owner: 'all' as const,
      sort: 'last_activity' as const,
      dir: 'desc' as const,
      limit: 50,
    };

    const listMs: number[] = [];
    const summaryMs: number[] = [];

    for (let i = 0; i < 7; i += 1) {
      const t0 = performance.now();
      await listContacts(tx, session, listQuery);
      listMs.push(performance.now() - t0);

      const t1 = performance.now();
      await getContactListSummary(tx, session);
      summaryMs.push(performance.now() - t1);
    }

    console.log('\nlistContacts (50 rows, last_activity desc)');
    console.log(`  p50 ${percentile(listMs, 50).toFixed(1)} ms · p95 ${percentile(listMs, 95).toFixed(1)} ms`);
    console.log('getContactListSummary (counts + smart lists)');
    console.log(
      `  p50 ${percentile(summaryMs, 50).toFixed(1)} ms · p95 ${percentile(summaryMs, 95).toFixed(1)} ms`,
    );
    console.log('\nBudget (rule 09): list first page < 300 ms p95; search < 500 ms (run with ?q= separately).');

    const searchMs: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const t0 = performance.now();
      await listContacts(tx, session, { ...listQuery, q: 'oak' });
      searchMs.push(performance.now() - t0);
    }
    console.log('\nlistContacts with q=oak');
    console.log(`  p95 ${percentile(searchMs, 95).toFixed(1)} ms (target < 500 ms)`);
  });

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
