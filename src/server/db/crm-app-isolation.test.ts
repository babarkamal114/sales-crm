import { describe, expect, it } from 'vitest';
import postgres from 'postgres';

/**
 * Proves the CRM app connection cannot read Sponsora / public tables.
 * Requires DATABASE_URL (crm_app). Skips when unset.
 */
describe('crm_app database isolation', () => {
  it('cannot read a non-CRM public table', async () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      return;
    }

    const sql = postgres(url, { prepare: false, max: 1 });

    try {
      await expect(
        sql`select 1 from public.users limit 1`,
      ).rejects.toSatisfy((error: unknown) => {
        const message =
          error instanceof Error ? error.message.toLowerCase() : String(error);
        return (
          message.includes('permission') ||
          message.includes('does not exist') ||
          message.includes('not exist') ||
          message.includes('access')
        );
      });
    } finally {
      await sql.end({ timeout: 5 });
    }
  });
});
