import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getEnv } from '@/server/env';
import * as schema from './schema';

/** Keep low per Node instance when using Neon pooler (many serverless instances × pool max ≈ DB load). */
const DEFAULT_POOL_MAX = 5;

let client: ReturnType<typeof postgres> | null = null;

function assertPooledDatabaseUrl(url: string): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  const looksPooled =
    url.includes('-pooler.') || url.includes('pgbouncer=true') || url.includes('pooler');
  if (!looksPooled) {
    console.warn(
      '[crm] DATABASE_URL does not look like a Neon pooler URL. Use a pooled connection for production scale.',
    );
  }
}

function getClient() {
  if (!client) {
    const env = getEnv();
    assertPooledDatabaseUrl(env.DATABASE_URL);
    client = postgres(env.DATABASE_URL, {
      prepare: false,
      max: env.DATABASE_POOL_MAX ?? DEFAULT_POOL_MAX,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
    });
  }
  return client;
}

export function getDb() {
  return drizzle(getClient(), { schema });
}

export type Db = ReturnType<typeof getDb>;
