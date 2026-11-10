'use server';

import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result';
import type { TurnstileAuthAction } from '@/lib/auth/turnstile-public';
import { getDb } from '@/server/db/client';
import { withAuthOperation } from '@/server/db/with-tenant';
import { membership, organisation, user } from '@/server/db/schema';
import {
  createSession,
  clearSessionCookies,
  deleteSession,
  getActiveSession,
  setActiveOrgCookie,
  setSessionCookie,
} from '@/server/auth/require-session';
import { slugifyOrganisationName } from '@/server/auth/constants';
import { bootstrapOrgOnboarding } from '@/server/onboarding/bootstrap-org-onboarding';
import { resolvePostAuthRedirect } from '@/server/onboarding/post-auth-redirect';
import type { CrmSession } from '@/server/auth/session-types';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import {
  isTurnstileEnabled,
  verifyTurnstileToken,
} from '@/server/auth/verify-turnstile';

const signInSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
  rememberMe: z.boolean().optional().default(false),
  turnstileToken: z.string().max(2048).optional(),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  organisationName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
  termsAccepted: z.literal(true, {
    error: 'You must accept the terms to continue.',
  }),
  turnstileToken: z.string().max(2048).optional(),
});

async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim();
  return ip ?? 'unknown';
}

async function enforceAuthTurnstile(input: {
  expectedAction: TurnstileAuthAction;
  turnstileToken?: string | undefined;
  remoteIp: string;
}): Promise<ActionResult<never> | null> {
  if (!isTurnstileEnabled()) {
    return null;
  }

  if (!input.turnstileToken) {
    return actionFailure(
      'BOT_CHECK_FAILED',
      'Complete the security check before continuing.',
    );
  }

  const verified = await verifyTurnstileToken({
    token: input.turnstileToken,
    expectedAction: input.expectedAction,
    remoteIp: input.remoteIp,
  });

  if (!verified) {
    return actionFailure(
      'BOT_CHECK_FAILED',
      'Security verification failed. Try again.',
    );
  }

  return null;
}

export async function signInAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Check your email and password.');
  }

  const turnstileFailure = await enforceAuthTurnstile({
    expectedAction: 'signin',
    turnstileToken: parsed.data.turnstileToken,
    remoteIp: await getClientIp(),
  });
  if (turnstileFailure) {
    return turnstileFailure;
  }

  const email = parsed.data.email.toLowerCase();
  const db = getDb();

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!existing || existing.status !== 'active' || existing.deletedAt) {
    return actionFailure('INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const valid = await verifyPassword(parsed.data.password, existing.passwordHash);
  if (!valid) {
    return actionFailure('INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const [member] = await db
    .select()
    .from(membership)
    .where(eq(membership.userId, existing.id))
    .limit(1);

  const created = await createSession(existing.id, parsed.data.rememberMe);
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
      userId: existing.id,
      role: member.role,
      email: existing.email,
      fullName: existing.fullName,
      organisationName: orgRow?.name ?? 'Organisation',
      expiresAt: created.expiresAt,
      orgOnboardingCompletedAt: null,
      profileCompletedAt: null,
    };
    return actionSuccess({
      redirectTo: await resolvePostAuthRedirect(session),
    });
  }

  return actionSuccess({ redirectTo: '/no-access' });
}

export async function signUpAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure(
      'VALIDATION_FAILED',
      first?.message ?? 'Check the form and try again.',
      typeof first?.path[0] === 'string' ? first.path[0] : undefined,
    );
  }

  const turnstileFailure = await enforceAuthTurnstile({
    expectedAction: 'signup',
    turnstileToken: parsed.data.turnstileToken,
    remoteIp: await getClientIp(),
  });
  if (turnstileFailure) {
    return turnstileFailure;
  }

  const email = parsed.data.email.toLowerCase();
  const db = getDb();

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    return actionFailure(
      'EMAIL_IN_USE',
      'An account with this email already exists.',
      'email',
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const baseSlug = slugifyOrganisationName(parsed.data.organisationName);
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

  const result = await withAuthOperation('sign_up', async (tx) => {
    const [org] = await tx
      .insert(organisation)
      .values({
        name: parsed.data.organisationName,
        slug,
      })
      .returning({ id: organisation.id });

    if (!org) {
      throw new Error('Failed to create organisation');
    }

    const [createdUser] = await tx
      .insert(user)
      .values({
        email,
        fullName: parsed.data.fullName,
        passwordHash,
        emailVerifiedAt: new Date(),
      })
      .returning({ id: user.id });

    if (!createdUser) {
      throw new Error('Failed to create user');
    }

    await tx.insert(membership).values({
      orgId: org.id,
      userId: createdUser.id,
      role: 'admin',
    });

    await bootstrapOrgOnboarding(tx, {
      orgId: org.id,
      userId: createdUser.id,
      displayName: parsed.data.organisationName,
    });

    return { userId: createdUser.id, orgId: org.id };
  });

  const created = await createSession(result.userId, true);
  await setSessionCookie(created.id, created.expiresAt);
  await setActiveOrgCookie(result.orgId);

  const session: CrmSession = {
    sessionId: created.id,
    orgId: result.orgId,
    userId: result.userId,
    role: 'admin',
    email,
    fullName: parsed.data.fullName,
    organisationName: parsed.data.organisationName,
    expiresAt: created.expiresAt,
    orgOnboardingCompletedAt: null,
    profileCompletedAt: null,
  };

  return actionSuccess({
    redirectTo: await resolvePostAuthRedirect(session),
  });
}

export async function signOutAction(): Promise<ActionResult<{ redirectTo: string }>> {
  const active = await getActiveSession();
  if (active) {
    await deleteSession(active.sessionId);
  }
  await clearSessionCookies();
  return actionSuccess({ redirectTo: '/sign-in' });
}
