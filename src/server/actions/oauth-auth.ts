'use server';

import { z } from 'zod';
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result';
import {
  clearGooglePendingProfileCookie,
  readGooglePendingProfileCookie,
} from '@/server/auth/google-oauth-cookies';
import {
  clearMicrosoftPendingProfileCookie,
  readMicrosoftPendingProfileCookie,
} from '@/server/auth/microsoft-oauth-cookies';
import { slugifyOrganisationName } from '@/server/auth/constants';
import { bootstrapOrgOnboarding } from '@/server/onboarding/bootstrap-org-onboarding';
import {
  establishOAuthSession,
  findUserByEmail,
  findUserByGoogleSub,
  findUserByMicrosoftSub,
  isActiveAuthUser,
  linkGoogleIdentity,
  linkMicrosoftIdentity,
} from '@/server/auth/oauth-session';
import { withAuthOperation } from '@/server/db/with-tenant';
import { membership, organisation, user } from '@/server/db/schema';

const completeOAuthSignUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your full name')
    .max(120, 'Name is too long'),
  organisationName: z
    .string()
    .trim()
    .min(2, 'Enter your organisation name')
    .max(160, 'Organisation name is too long'),
  termsAccepted: z.literal(true, {
    error: 'You must accept the terms to continue.',
  }),
});

export async function completeGoogleSignUpAction(
  rawInput: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = completeOAuthSignUpSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure(
      'VALIDATION_FAILED',
      first?.message ?? 'Check the form and try again.',
      typeof first?.path[0] === 'string' ? first.path[0] : undefined,
    );
  }

  const profile = await readGooglePendingProfileCookie();
  if (!profile) {
    return actionFailure(
      'GOOGLE_PENDING_EXPIRED',
      'Google sign-in expired before you finished. Start again.',
    );
  }

  const now = new Date();

  try {
    const existing =
      (await findUserByGoogleSub(profile.sub)) ??
      (await findUserByEmail(profile.email));

    if (existing) {
      if (!isActiveAuthUser(existing)) {
        return actionFailure(
          'GOOGLE_SIGN_UP_FAILED',
          'Could not complete Google sign-up. Try again.',
        );
      }
      await linkGoogleIdentity(existing, profile, now);
      const session = await establishOAuthSession(existing);
      await clearGooglePendingProfileCookie();
      return actionSuccess({ redirectTo: session.redirectTo });
    }

    const baseSlug = slugifyOrganisationName(parsed.data.organisationName);
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

    await withAuthOperation('sign_up', async (tx) => {
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
          email: profile.email,
          fullName: parsed.data.fullName,
          passwordHash: null,
          googleSub: profile.sub,
          emailVerifiedAt: now,
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
    });

    const owner = await findUserByGoogleSub(profile.sub);
    if (!owner) {
      throw new Error('google_owner_missing');
    }

    const session = await establishOAuthSession(owner);
    await clearGooglePendingProfileCookie();
    return actionSuccess({ redirectTo: session.redirectTo });
  } catch {
    return actionFailure(
      'GOOGLE_SIGN_UP_FAILED',
      'Could not complete Google sign-up. Try again.',
    );
  }
}

export async function completeMicrosoftSignUpAction(
  rawInput: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = completeOAuthSignUpSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure(
      'VALIDATION_FAILED',
      first?.message ?? 'Check the form and try again.',
      typeof first?.path[0] === 'string' ? first.path[0] : undefined,
    );
  }

  const profile = await readMicrosoftPendingProfileCookie();
  if (!profile) {
    return actionFailure(
      'MICROSOFT_PENDING_EXPIRED',
      'Microsoft sign-in expired before you finished. Start again.',
    );
  }

  const now = new Date();

  try {
    const existing =
      (await findUserByMicrosoftSub(profile.sub)) ??
      (await findUserByEmail(profile.email));

    if (existing) {
      if (!isActiveAuthUser(existing)) {
        return actionFailure(
          'MICROSOFT_SIGN_UP_FAILED',
          'Could not complete Microsoft sign-up. Try again.',
        );
      }
      await linkMicrosoftIdentity(existing, profile, now);
      const session = await establishOAuthSession(existing);
      await clearMicrosoftPendingProfileCookie();
      return actionSuccess({ redirectTo: session.redirectTo });
    }

    const baseSlug = slugifyOrganisationName(parsed.data.organisationName);
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

    await withAuthOperation('sign_up', async (tx) => {
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
          email: profile.email,
          fullName: parsed.data.fullName,
          passwordHash: null,
          microsoftSub: profile.sub,
          emailVerifiedAt: now,
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
    });

    const owner = await findUserByMicrosoftSub(profile.sub);
    if (!owner) {
      throw new Error('microsoft_owner_missing');
    }

    const session = await establishOAuthSession(owner);
    await clearMicrosoftPendingProfileCookie();
    return actionSuccess({ redirectTo: session.redirectTo });
  } catch {
    return actionFailure(
      'MICROSOFT_SIGN_UP_FAILED',
      'Could not complete Microsoft sign-up. Try again.',
    );
  }
}
