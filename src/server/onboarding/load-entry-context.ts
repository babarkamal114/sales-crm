import 'server-only';

import { eq, inArray } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import type { OnboardingStepSlug } from '@/domain/onboarding/steps';
import type { EntryContext } from '@/domain/onboarding/entry-types';
import type { CrmSession } from '@/server/auth/session-types';
import {
  accessRequest,
  membership,
  onboardingProgress,
  organisation,
  organisationSettings,
  user,
  userProfile,
} from '@/server/db/schema';
import { withUserId } from '@/server/db/with-tenant';
import { ACTIVE_ORG_COOKIE_NAME } from '@/server/auth/constants';
import { cookies } from 'next/headers';

function parseSteps(values: string[] | null | undefined): OnboardingStepSlug[] {
  if (!values?.length) {
    return [];
  }
  return values as OnboardingStepSlug[];
}

export async function loadEntryContext(session: CrmSession): Promise<EntryContext> {
  const cookieStore = await cookies();
  const activeOrgId =
    cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value ?? session.orgId;

  const row = await withUserId(session.userId, async (tx) => {
    const memberships = await tx
      .select({
        orgId: membership.orgId,
        role: membership.role,
        orgName: organisation.name,
      })
      .from(membership)
      .innerJoin(organisation, eq(membership.orgId, organisation.id))
      .where(eq(membership.userId, session.userId));

    const orgIds = memberships.map((m) => m.orgId);
    if (orgIds.length === 0) {
      const [profile] = await tx
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, session.userId))
        .limit(1);

      const pendingAccessOnly = await tx
        .select()
        .from(accessRequest)
        .where(eq(accessRequest.requesterUserId, session.userId))
        .limit(1);

      return {
        memberships: [],
        settings: [],
        progress: [],
        profile,
        pendingAccess: pendingAccessOnly[0] ?? null,
      };
    }

    const settings = await tx
      .select()
      .from(organisationSettings)
      .where(inArray(organisationSettings.orgId, orgIds));
    const progress = await tx
      .select()
      .from(onboardingProgress)
      .where(inArray(onboardingProgress.orgId, orgIds));

    const [profile] = await tx
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, session.userId))
      .limit(1);

    const pendingAccess = await tx
      .select()
      .from(accessRequest)
      .where(eq(accessRequest.requesterUserId, session.userId))
      .limit(1);

    return {
      memberships,
      settings,
      progress,
      profile,
      pendingAccess: pendingAccess[0] ?? null,
    };
  });

  const settingsByOrg = new Map(row.settings.map((s) => [s.orgId, s]));
  const progressByOrg = new Map(row.progress.map((p) => [p.orgId, p]));

  const starterIds = [
    ...new Set(
      row.progress
        .map((p) => p.setupStartedByUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const starterNames =
    starterIds.length === 0
      ? []
      : await getDb()
          .select({ id: user.id, fullName: user.fullName })
          .from(user)
          .where(inArray(user.id, starterIds));

  const nameByUserId = new Map(starterNames.map((u) => [u.id, u.fullName]));

  const organisations = row.memberships.map((m) => {
    const settings = settingsByOrg.get(m.orgId);
    const prog = progressByOrg.get(m.orgId);
    const setupUserId = prog?.setupStartedByUserId ?? null;

    return {
      orgId: m.orgId,
      orgName: m.orgName,
      onboardingCompletedAt: settings?.onboardingCompletedAt ?? null,
      currentStep: (prog?.currentStep as OnboardingStepSlug | null) ?? null,
      completedSteps: parseSteps(prog?.completedSteps),
      skippedSteps: parseSteps(prog?.skippedSteps),
      setupStartedByUserId: setupUserId,
      setupStartedByName: setupUserId
        ? (nameByUserId.get(setupUserId) ?? null)
        : null,
      sponsoroOrganisationName: null,
      hasAnyCrmMember: true,
    };
  });

  const pendingForActive = row.pendingAccess;

  return {
    userId: session.userId,
    fullName: session.fullName,
    email: session.email,
    activeOrgId: activeOrgId ?? null,
    memberships: row.memberships.map((m) => ({
      orgId: m.orgId,
      role: m.role,
    })),
    organisations,
    pendingInvitation: null,
    accessRequest: pendingForActive
      ? {
          status: pendingForActive.status,
          createdAt: pendingForActive.createdAt,
        }
      : null,
    memberProfileCompleted: Boolean(row.profile?.profileCompletedAt),
    memberTourComplete: Boolean(
      row.profile?.tourCompletedAt ?? row.profile?.profileCompletedAt,
    ),
    hasExternalOrganisationIdentity: false,
  };
}
