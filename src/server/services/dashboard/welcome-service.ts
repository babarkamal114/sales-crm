import 'server-only';

import { sql } from 'drizzle-orm';
import type { DashboardScenario } from '@/domain/dashboard/schemas';
import type { DashboardWelcomeResponse } from '@/domain/dashboard/types';
import { resolveWelcomeResponse } from '@/domain/dashboard/welcome-resolve';
import type { WelcomeOrgSnapshot } from '@/domain/dashboard/welcome-snapshot';
import type { OnboardingStepSlug } from '@/domain/onboarding/steps';
import type { CrmRole } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

type WelcomeSnapshotRow = {
  completed_at: Date | null;
  current_step: string | null;
  has_pipeline: boolean;
  contact_count: number;
  email_connected: boolean;
  calling_connected: boolean;
  stripe_connected: boolean;
  active_member_count: number;
  invite_count: number;
  profile_completed_at: Date | null;
  tour_completed_at: Date | null;
};

function rowToSnapshot(row: WelcomeSnapshotRow | undefined): WelcomeOrgSnapshot {
  return {
    onboardingCompletedAt: row?.completed_at ? new Date(row.completed_at) : null,
    onboardingCurrentStep: (row?.current_step as OnboardingStepSlug | null) ?? null,
    hasDefaultPipeline: Boolean(row?.has_pipeline),
    contactCount: row?.contact_count ?? 0,
    emailConnected: Boolean(row?.email_connected),
    callingConnected: Boolean(row?.calling_connected),
    stripeConnected: Boolean(row?.stripe_connected),
    activeMemberCount: row?.active_member_count ?? 0,
    pendingInviteCount: row?.invite_count ?? 0,
    profileCompletedAt: row?.profile_completed_at
      ? new Date(row.profile_completed_at)
      : null,
    tourCompletedAt: row?.tour_completed_at ? new Date(row.tour_completed_at) : null,
  };
}

/** One round-trip inside the tenant transaction. */
export async function loadWelcomeOrgSnapshot(
  tx: DbTransaction,
  orgId: string,
  userId: string,
): Promise<WelcomeOrgSnapshot> {
  const result = await tx.execute<WelcomeSnapshotRow>(sql`
    SELECT
      os.onboarding_completed_at AS completed_at,
      op.current_step,
      EXISTS (
        SELECT 1 FROM crm.pipeline p
        WHERE p.org_id = ${orgId}::uuid AND p.is_default = true
      ) AS has_pipeline,
      (
        SELECT count(*)::int FROM crm.contact c
        WHERE c.org_id = ${orgId}::uuid
      ) AS contact_count,
      EXISTS (
        SELECT 1 FROM crm.integration_connection ic
        WHERE ic.org_id = ${orgId}::uuid
          AND ic.capability = 'email'
          AND ic.status = 'connected'
      ) AS email_connected,
      EXISTS (
        SELECT 1 FROM crm.integration_connection ic
        WHERE ic.org_id = ${orgId}::uuid
          AND ic.capability = 'telephony'
          AND ic.status = 'connected'
      ) AS calling_connected,
      EXISTS (
        SELECT 1 FROM crm.integration_connection ic
        WHERE ic.org_id = ${orgId}::uuid
          AND ic.provider = 'stripe_connect'
          AND ic.status = 'connected'
      ) AS stripe_connected,
      (
        SELECT count(*)::int
        FROM crm.membership m
        INNER JOIN crm."user" u ON u.id = m.user_id
        WHERE m.org_id = ${orgId}::uuid AND u.deleted_at IS NULL
      ) AS active_member_count,
      (
        SELECT count(*)::int FROM crm.member_invitation mi
        WHERE mi.org_id = ${orgId}::uuid AND mi.status = 'pending'
      ) AS invite_count,
      up.profile_completed_at,
      up.tour_completed_at
    FROM crm.organisation_settings os
    LEFT JOIN crm.onboarding_progress op ON op.org_id = os.org_id
    LEFT JOIN crm.user_profile up ON up.user_id = ${userId}::uuid
    WHERE os.org_id = ${orgId}::uuid
    LIMIT 1
  `);

  return rowToSnapshot(result[0]);
}

export async function buildWelcomeFromDb(
  tx: DbTransaction,
  orgId: string,
  userId: string,
  role: CrmRole,
  scenario?: DashboardScenario,
): Promise<DashboardWelcomeResponse> {
  const snapshot = await loadWelcomeOrgSnapshot(tx, orgId, userId);
  return resolveWelcomeResponse({
    ...(scenario ? { scenario } : {}),
    role,
    snapshot,
  });
}
