import { getDb } from '@/server/db/client';
import type { DbTransaction } from '@/server/db/with-tenant';

const rollbackSignal = Symbol('rollbackTransaction');

/** Runs `fn` in a DB transaction that is always rolled back (no persistent test data). */
export async function withRollbackTransaction<T>(
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const db = getDb();
  let result!: T;

  try {
    await db.transaction(async (tx) => {
      result = await fn(tx);
      throw rollbackSignal;
    });
  } catch (error) {
    if (error !== rollbackSignal) {
      throw error;
    }
  }

  return result;
}
