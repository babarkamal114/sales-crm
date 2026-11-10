import 'server-only';

import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import type { CrmRole } from '@/server/db/schema';

export type Db = PostgresJsDatabase<typeof schema>;
export type DbTransaction = Parameters<Parameters<Db['transaction']>[0]>[0];

export type TenantSession = {
  orgId: string;
  userId: string;
  role: CrmRole;
};

export type AuthOperation = 'sign_in' | 'sign_up';

async function setTenantContext(tx: DbTransaction, session: TenantSession) {
  await tx.execute(sql`
    select
      set_config('app.org_id', ${session.orgId}, true),
      set_config('app.user_id', ${session.userId}, true),
      set_config('app.role', ${session.role}, true)
  `);
}

async function setAuthOperation(tx: DbTransaction, operation: AuthOperation) {
  await tx.execute(
    sql`select set_config('app.auth_operation', ${operation}, true)`,
  );
}

/** Run queries with tenant RLS context set from the verified session. */
export async function withTenant<T>(
  session: TenantSession,
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const db = getDb();

  return db.transaction(async (tx) => {
    await setTenantContext(tx, session);
    return fn(tx);
  });
}

/** Auth bootstrap queries (sign-up org/membership creation). */
export async function withAuthOperation<T>(
  operation: AuthOperation,
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const db = getDb();

  return db.transaction(async (tx) => {
    await setAuthOperation(tx, operation);
    return fn(tx);
  });
}

/** Cross-org reads for entry routing (sets `app.user_id` only). */
export async function withUserId<T>(
  userId: string,
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const db = getDb();

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

/** Background jobs: org-scoped RLS with system role (rule 10). */
export async function withTenantSystem<T>(
  orgId: string,
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const db = getDb();

  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select
        set_config('app.org_id', ${orgId}, true),
        set_config('app.user_id', 'system', true),
        set_config('app.role', 'system', true)
    `);
    return fn(tx);
  });
}
