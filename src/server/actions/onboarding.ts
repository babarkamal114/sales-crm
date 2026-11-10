'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result';
import { CRM_AGREEMENT_VERSIONS } from '@/domain/onboarding/agreements';
import { normalizePhoneE164 } from '@/domain/lib/phone-e164';
import {
  ONBOARDING_STEP,
  type OnboardingStepSlug,
} from '@/domain/onboarding/steps';
import { getActiveSession, requireSession } from '@/server/auth/require-session';
import { writeAudit } from '@/server/audit/write';
import {
  agreementAcceptance,
  onboardingProgress,
  organisation,
  organisationSettings,
  user,
  userProfile,
} from '@/server/db/schema';
import { withTenant } from '@/server/db/with-tenant';
import { addLeadDuringOnboarding } from '@/server/services/onboarding/add-lead';
import { confirmPipelineStep } from '@/server/services/onboarding/confirm-pipeline-step';
import { inviteTeamMemberDuringOnboarding } from '@/server/services/onboarding/invite-team-member';
import {
  markOnboardingStepComplete,
  markOnboardingStepSkipped,
} from '@/server/services/onboarding/progress';

async function clientIpHash(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return createHash('sha256').update(ip).digest('hex');
}

const profileStepSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  jobTitle: z.string().trim().max(120).optional(),
  phoneE164: z.string().trim().max(20).optional(),
  timeZone: z.string().trim().min(1).max(80),
});

export async function saveProfileStepAction(
  input: unknown,
): Promise<ActionResult<{ nextPath: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = profileStepSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure(
      'VALIDATION_FAILED',
      first?.message ?? 'Check the form and try again.',
      typeof first?.path[0] === 'string' ? first.path[0] : undefined,
    );
  }

  const phoneRaw =
    parsed.data.phoneE164 && parsed.data.phoneE164.length > 0
      ? parsed.data.phoneE164
      : undefined;
  const phone = phoneRaw ? normalizePhoneE164(phoneRaw) : undefined;
  if (phoneRaw && !phone) {
    return actionFailure(
      'VALIDATION_FAILED',
      'Enter a valid phone number with country code (e.g. +44…).',
      'phoneE164',
    );
  }

  await withTenant(
    {
      orgId: session.orgId,
      userId: session.userId,
      role: session.role,
    },
    async (tx) => {
      await tx
        .update(user)
        .set({
          fullName: parsed.data.fullName,
          updatedAt: new Date(),
        })
        .where(eq(user.id, session.userId));

      await tx
        .insert(userProfile)
        .values({
          userId: session.userId,
          jobTitle: parsed.data.jobTitle ?? null,
          phoneE164: phone ?? null,
          timeZone: parsed.data.timeZone,
          profileCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userProfile.userId,
          set: {
            jobTitle: parsed.data.jobTitle ?? null,
            phoneE164: phone ?? null,
            timeZone: parsed.data.timeZone,
            profileCompletedAt: new Date(),
            updatedAt: new Date(),
          },
        });

      const [progress] = await tx
        .select()
        .from(onboardingProgress)
        .where(eq(onboardingProgress.orgId, session.orgId))
        .limit(1);

      const completed = new Set(progress?.completedSteps ?? []);
      completed.add(ONBOARDING_STEP.profile);

      await tx
        .update(onboardingProgress)
        .set({
          completedSteps: [...completed],
          currentStep: ONBOARDING_STEP.organisation,
          updatedAt: new Date(),
          updatedBy: session.userId,
        })
        .where(eq(onboardingProgress.orgId, session.orgId));

      await writeAudit(tx, {
        orgId: session.orgId,
        actorType: 'user',
        actorId: session.userId,
        action: 'onboarding.profile_saved',
        entityType: 'user',
        entityId: session.userId,
      });
    },
  );

  const nextPath =
    session.role === 'admin'
      ? `/onboarding/${ONBOARDING_STEP.organisation}`
      : '/';

  return actionSuccess({ nextPath });
}

export async function getProfileStepInitialValues(): Promise<{
  fullName: string;
  jobTitle: string;
  phoneE164: string;
  timeZone: string;
}> {
  const session = await getActiveSession();
  if (!session) {
    return {
      fullName: '',
      jobTitle: '',
      phoneE164: '',
      timeZone: 'Europe/London',
    };
  }

  const { getDb } = await import('@/server/db/client');
  const db = getDb();
  const [profile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, session.userId))
    .limit(1);

  return {
    fullName: session.fullName,
    jobTitle: profile?.jobTitle ?? '',
    phoneE164: profile?.phoneE164 ?? '',
    timeZone: profile?.timeZone ?? 'Europe/London',
  };
}

const organisationStepSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  industry: z.string().trim().max(120).optional(),
  teamSizeBand: z.string().trim().max(40).optional(),
  country: z.string().trim().min(2).max(2).default('GB'),
  currency: z.string().trim().min(3).max(3).default('GBP'),
  timeZone: z.string().trim().min(1).max(80).default('Europe/London'),
  postalAddress: z.string().trim().max(500).optional(),
  leadSources: z.array(z.string()).default([]),
  contactChannels: z.array(z.string()).default([]),
});

export async function saveOrganisationStepAction(
  input: unknown,
): Promise<ActionResult<{ nextPath: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can update organisation setup.');
  }

  const parsed = organisationStepSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure(
      'VALIDATION_FAILED',
      first?.message ?? 'Check the form and try again.',
      typeof first?.path[0] === 'string' ? first.path[0] : undefined,
    );
  }

  await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      await tx
        .update(organisationSettings)
        .set({
          displayName: parsed.data.displayName,
          industry: parsed.data.industry ?? null,
          teamSizeBand: parsed.data.teamSizeBand ?? null,
          country: parsed.data.country,
          currency: parsed.data.currency,
          timeZone: parsed.data.timeZone,
          postalAddress: parsed.data.postalAddress ?? null,
          leadSources: parsed.data.leadSources,
          contactChannels: parsed.data.contactChannels,
          updatedAt: new Date(),
          updatedBy: session.userId,
        })
        .where(eq(organisationSettings.orgId, session.orgId));

      await tx
        .update(organisation)
        .set({
          name: parsed.data.displayName,
          updatedAt: new Date(),
        })
        .where(eq(organisation.id, session.orgId));

      await writeAudit(tx, {
        orgId: session.orgId,
        actorType: 'user',
        actorId: session.userId,
        action: 'onboarding.organisation_saved',
        entityType: 'organisation',
        entityId: session.orgId,
      });
    },
  );

  const nextPath = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) =>
      markOnboardingStepComplete(tx, session, ONBOARDING_STEP.organisation),
  );
  return actionSuccess({ nextPath });
}

const agreementsSchema = z.object({
  acceptTerms: z.literal(true),
  acceptDpa: z.literal(true),
});

export async function saveAgreementsStepAction(
  input: unknown,
): Promise<ActionResult<{ nextPath: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can accept agreements.');
  }

  const parsed = agreementsSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure(
      'VALIDATION_FAILED',
      'Accept both agreements to continue.',
    );
  }

  const ipHash = await clientIpHash();

  await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      for (const agreement of ['terms', 'dpa'] as const) {
        await tx
          .insert(agreementAcceptance)
          .values({
            orgId: session.orgId,
            agreement,
            version: CRM_AGREEMENT_VERSIONS[agreement],
            acceptedBy: session.userId,
            ipHash,
          })
          .onConflictDoNothing();
      }

      await writeAudit(tx, {
        orgId: session.orgId,
        actorType: 'user',
        actorId: session.userId,
        action: 'onboarding.agreements_accepted',
        entityType: 'organisation',
        entityId: session.orgId,
      });
    },
  );

  const nextPath = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) =>
      markOnboardingStepComplete(tx, session, ONBOARDING_STEP.agreements),
  );
  return actionSuccess({ nextPath });
}

export async function confirmPipelineStepAction(): Promise<
  ActionResult<{ nextPath: string }>
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can configure the pipeline.');
  }

  const nextPath = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => confirmPipelineStep(tx, session),
  );
  return actionSuccess({ nextPath });
}

export async function skipOptionalOnboardingStepAction(
  step: OnboardingStepSlug,
): Promise<ActionResult<{ nextPath: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can change setup steps.');
  }

  const optional: OnboardingStepSlug[] = [
    ONBOARDING_STEP.leads,
    ONBOARDING_STEP.team,
    ONBOARDING_STEP.tools,
    ONBOARDING_STEP.tour,
  ];
  if (!optional.includes(step)) {
    return actionFailure('VALIDATION_FAILED', 'This step cannot be skipped.');
  }

  const nextPath = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      await writeAudit(tx, {
        orgId: session.orgId,
        actorType: 'user',
        actorId: session.userId,
        action: 'onboarding.step_skipped',
        entityType: 'onboarding_step',
        entityId: step,
      });
      return markOnboardingStepSkipped(tx, session, step);
    },
  );

  return actionSuccess({ nextPath });
}

export async function finalizeOnboardingAction(): Promise<
  ActionResult<{ nextPath: string }>
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can finish organisation setup.');
  }

  const now = new Date();

  await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      const [progress] = await tx
        .select()
        .from(onboardingProgress)
        .where(eq(onboardingProgress.orgId, session.orgId))
        .limit(1);

      const completed = new Set(progress?.completedSteps ?? []);
      completed.add(ONBOARDING_STEP.complete);

      await tx
        .update(onboardingProgress)
        .set({
          completedSteps: [...completed],
          currentStep: ONBOARDING_STEP.complete,
          updatedAt: now,
          updatedBy: session.userId,
        })
        .where(eq(onboardingProgress.orgId, session.orgId));

      await tx
        .update(organisationSettings)
        .set({
          onboardingCompletedAt: now,
          onboardingCompletedBy: session.userId,
          updatedAt: now,
          updatedBy: session.userId,
        })
        .where(eq(organisationSettings.orgId, session.orgId));

      await writeAudit(tx, {
        orgId: session.orgId,
        actorType: 'user',
        actorId: session.userId,
        action: 'onboarding.completed',
        entityType: 'organisation',
        entityId: session.orgId,
      });
    },
  );

  return actionSuccess({ nextPath: '/getting-started' });
}

const addLeadSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  email: z.string().trim().max(320).optional(),
  title: z.string().trim().min(1).max(200),
  valuePence: z.coerce.number().int().min(0).optional(),
  marketingConsent: z.boolean(),
});

export async function addLeadStepAction(
  input: unknown,
): Promise<ActionResult<{ nextPath: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can add leads during setup.');
  }

  const parsed = addLeadSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure(
      'VALIDATION_FAILED',
      first?.message ?? 'Check the form and try again.',
    );
  }

  const emailRaw = parsed.data.email?.trim();
  if (emailRaw) {
    const emailCheck = z.string().email().safeParse(emailRaw);
    if (!emailCheck.success) {
      return actionFailure('VALIDATION_FAILED', 'Enter a valid email.', 'email');
    }
  }

  const nextPath = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) =>
      addLeadDuringOnboarding(tx, session, {
        displayName: parsed.data.displayName,
        ...(emailRaw ? { email: emailRaw } : {}),
        title: parsed.data.title,
        ...(parsed.data.valuePence !== undefined
          ? { valuePence: parsed.data.valuePence }
          : {}),
        marketingConsent: parsed.data.marketingConsent,
      }),
  );

  return actionSuccess({ nextPath });
}

const inviteTeamSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(['admin', 'manager', 'member']),
});

export async function inviteTeamStepAction(
  input: unknown,
): Promise<ActionResult<{ nextPath: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can invite teammates.');
  }

  const parsed = inviteTeamSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Enter a valid email and role.');
  }

  const result = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) =>
      inviteTeamMemberDuringOnboarding(tx, session, {
        email: parsed.data.email,
        role: parsed.data.role,
      }),
  );

  return actionSuccess({ nextPath: result.nextPath });
}

export async function completeToolsStepAction(): Promise<
  ActionResult<{ nextPath: string }>
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can finish this step.');
  }

  const nextPath = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) =>
      markOnboardingStepComplete(tx, session, ONBOARDING_STEP.tools),
  );

  return actionSuccess({ nextPath });
}
