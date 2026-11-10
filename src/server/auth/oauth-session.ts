import 'server-only';

import { eq } from 'drizzle-orm';
import type { GooglePendingProfile } from '@/lib/auth/google-oauth';
import type { MicrosoftPendingProfile } from '@/lib/auth/microsoft-oauth';
import { getDb } from '@/server/db/client';
import { membership, organisation, user, type User } from '@/server/db/schema';
import {
  createSession,
  setActiveOrgCookie,
  setSessionCookie,
} from '@/server/auth/require-session';
import type { CrmSession } from '@/server/auth/session-types';
import { resolvePostAuthRedirect } from '@/server/onboarding/post-auth-redirect';

export function isActiveAuthUser(row: User): boolean {
  return row.status === 'active' && !row.deletedAt;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);
  return row ?? null;
}

export async function findUserByGoogleSub(sub: string): Promise<User | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.googleSub, sub))
    .limit(1);
  return row ?? null;
}

export async function findUserByMicrosoftSub(
  sub: string,
): Promise<User | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.microsoftSub, sub))
    .limit(1);
  return row ?? null;
}

export async function establishOAuthSession(
  authUser: User,
): Promise<{ redirectTo: string }> {
  const db = getDb();
  const [member] = await db
    .select()
    .from(membership)
    .where(eq(membership.userId, authUser.id))
    .limit(1);

  const created = await createSession(authUser.id, true);
  await setSessionCookie(created.id, created.expiresAt);

  if (member) {
    await setActiveOrgCookie(member.orgId);
    const [orgRow] = await db
      .select({ name: organisation.name })
      .from(organisation)
      .where(eq(organisation.id, member.orgId))
      .limit(1);
    const session: CrmSession = {
      sessionId: created.id,
      orgId: member.orgId,
      userId: authUser.id,
      role: member.role,
      email: authUser.email,
      fullName: authUser.fullName,
      organisationName: orgRow?.name ?? 'Organisation',
      expiresAt: created.expiresAt,
      orgOnboardingCompletedAt: null,
      profileCompletedAt: null,
    };
    return { redirectTo: await resolvePostAuthRedirect(session) };
  }

  return { redirectTo: '/no-access' };
}

export async function linkGoogleIdentity(
  authUser: User,
  profile: Omit<GooglePendingProfile, 'expiresAt'>,
  now = new Date(),
): Promise<void> {
  if (authUser.googleSub && authUser.googleSub !== profile.sub) {
    throw new Error('google_sub_conflict');
  }

  if (authUser.googleSub === profile.sub && authUser.emailVerifiedAt) {
    return;
  }

  const db = getDb();
  await db
    .update(user)
    .set({
      googleSub: profile.sub,
      emailVerifiedAt: authUser.emailVerifiedAt ?? now,
      updatedAt: now,
    })
    .where(eq(user.id, authUser.id));
}

export async function linkMicrosoftIdentity(
  authUser: User,
  profile: Omit<MicrosoftPendingProfile, 'expiresAt'>,
  now = new Date(),
): Promise<void> {
  if (authUser.microsoftSub && authUser.microsoftSub !== profile.sub) {
    throw new Error('microsoft_sub_conflict');
  }

  if (authUser.microsoftSub === profile.sub && authUser.emailVerifiedAt) {
    return;
  }

  const db = getDb();
  await db
    .update(user)
    .set({
      microsoftSub: profile.sub,
      emailVerifiedAt: authUser.emailVerifiedAt ?? now,
      updatedAt: now,
    })
    .where(eq(user.id, authUser.id));
}
