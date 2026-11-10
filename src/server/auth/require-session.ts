import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import {
  membership,
  organisation,
  organisationSettings,
  session,
  user,
  userProfile,
} from '@/server/db/schema';
import { getEnv } from '@/server/env';
import {
  ACTIVE_ORG_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  sessionExpiresAt,
} from '@/server/auth/constants';
import type { CrmSession } from '@/server/auth/session-types';

function shouldUseSecureSessionCookies(): boolean {
  if (getEnv().ALLOW_INSECURE_SESSION_COOKIES) {
    return false;
  }
  return getEnv().NODE_ENV === 'production';
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: shouldUseSecureSessionCookies(),
  };
}

export async function createSession(
  userId: string,
  rememberMe: boolean,
  now = new Date(),
): Promise<{ id: string; expiresAt: Date }> {
  const db = getDb();
  const expiresAt = sessionExpiresAt(rememberMe, now);

  const [created] = await db
    .insert(session)
    .values({ userId, expiresAt })
    .returning({ id: session.id, expiresAt: session.expiresAt });

  if (!created) {
    throw new Error('Failed to create session');
  }

  return created;
}

export async function setSessionCookie(
  sessionId: string,
  expiresAt: Date,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    ...sessionCookieOptions(),
    expires: expiresAt,
  });
}

export async function setActiveOrgCookie(orgId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE_NAME, orgId, {
    ...sessionCookieOptions(),
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(ACTIVE_ORG_COOKIE_NAME);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = getDb();
  await db.delete(session).where(eq(session.id, sessionId));
}

async function readActiveSession(): Promise<CrmSession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    return null;
  }

  const preferredOrgId = cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value;
  const now = new Date();
  const db = getDb();

  const membershipFilter = preferredOrgId
    ? eq(membership.orgId, preferredOrgId)
    : undefined;

  const rows = await db
    .select({
      sessionId: session.id,
      expiresAt: session.expiresAt,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      orgId: membership.orgId,
      role: membership.role,
      organisationName: organisation.name,
      orgOnboardingCompletedAt: organisationSettings.onboardingCompletedAt,
      profileCompletedAt: userProfile.profileCompletedAt,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .innerJoin(membership, eq(membership.userId, user.id))
    .innerJoin(organisation, eq(organisation.id, membership.orgId))
    .leftJoin(
      organisationSettings,
      eq(organisationSettings.orgId, membership.orgId),
    )
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(
      and(
        eq(session.id, sessionId),
        gt(session.expiresAt, now),
        eq(user.status, 'active'),
        isNull(user.deletedAt),
        membershipFilter,
      ),
    )
    .limit(preferredOrgId ? 1 : 10);

  if (rows.length === 0) {
    return null;
  }

  const preferred =
    (preferredOrgId
      ? rows.find((row) => row.orgId === preferredOrgId)
      : undefined) ?? rows[0];

  if (!preferred) {
    return null;
  }

  return {
    sessionId: preferred.sessionId,
    orgId: preferred.orgId,
    userId: preferred.userId,
    role: preferred.role,
    email: preferred.email,
    fullName: preferred.fullName,
    organisationName: preferred.organisationName,
    expiresAt: preferred.expiresAt,
    orgOnboardingCompletedAt: preferred.orgOnboardingCompletedAt ?? null,
    profileCompletedAt: preferred.profileCompletedAt ?? null,
  };
}

export const getActiveSession = cache(async (): Promise<CrmSession | null> => {
  return readActiveSession();
});

export const requireSession = cache(async (): Promise<CrmSession> => {
  const active = await getActiveSession();
  if (!active) {
    throw new Error('Unauthenticated');
  }
  return active;
});

/** Session present but no CRM membership for any organisation. */
export async function getSignedInUserWithoutMembership(): Promise<{
  userId: string;
  email: string;
  fullName: string;
} | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    return null;
  }

  const now = new Date();
  const db = getDb();

  const [row] = await db
    .select({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(
      and(
        eq(session.id, sessionId),
        gt(session.expiresAt, now),
        eq(user.status, 'active'),
        isNull(user.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const [hasMembership] = await db
    .select({ id: membership.id })
    .from(membership)
    .where(eq(membership.userId, row.userId))
    .limit(1);

  if (hasMembership) {
    return null;
  }

  return {
    userId: row.userId,
    email: row.email,
    fullName: row.fullName,
  };
}
