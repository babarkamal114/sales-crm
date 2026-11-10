import { sql } from 'drizzle-orm';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export async function setTenantContext(tx: DbTransaction, session: TenantSession) {
  await tx.execute(sql`
    select
      set_config('app.org_id', ${session.orgId}, true),
      set_config('app.user_id', ${session.userId}, true),
      set_config('app.role', ${session.role}, true)
  `);
}

export async function setAuthOperation(tx: DbTransaction, operation: 'sign_in' | 'sign_up') {
  await tx.execute(sql`select set_config('app.auth_operation', ${operation}, true)`);
}

export async function clearAuthOperation(tx: DbTransaction) {
  await tx.execute(sql`select set_config('app.auth_operation', '', true)`);
}
