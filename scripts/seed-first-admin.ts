/**
 * Optional one-off: create a first Admin when sign-up UI is unavailable.
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='...' SEED_ADMIN_NAME='You' \
 *   SEED_ORG_NAME='Sponsoro' pnpm db:seed-admin
 *
 * Prefer /sign-up in normal development — first user of an organisation becomes Admin.
 */
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hash } from '@node-rs/argon2';
import {
  membership,
  organisation,
  user,
} from '../src/server/db/schema';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const databaseUrl = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME ?? 'CRM Admin';
  const orgName = process.env.SEED_ORG_NAME ?? 'Demo organisation';

  if (!databaseUrl || !email || !password) {
    throw new Error(
      'Set DATABASE_MIGRATION_URL (or DATABASE_URL), SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.',
    );
  }

  const client = postgres(databaseUrl, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    await client`select set_config('app.auth_operation', 'sign_up', true)`;

    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existing) {
      console.log('User already exists; skipping.');
      return;
    }

    const passwordHash = await hash(password, {
      memoryCost: 19_456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    const slug = `${orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)}-seed`;

    const [org] = await db
      .insert(organisation)
      .values({ name: orgName, slug })
      .returning({ id: organisation.id });

    if (!org) {
      throw new Error('Failed to create organisation');
    }

    const [created] = await db
      .insert(user)
      .values({
        email,
        fullName,
        passwordHash,
        emailVerifiedAt: new Date(),
      })
      .returning({ id: user.id });

    if (!created) {
      throw new Error('Failed to create user');
    }

    await db.insert(membership).values({
      orgId: org.id,
      userId: created.id,
      role: 'admin',
    });

    console.log(`Created Admin ${email} for organisation ${orgName}.`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
