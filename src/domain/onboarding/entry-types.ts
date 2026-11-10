import type { CrmRole } from '@/server/db/schema';
import type { OnboardingStepSlug } from '@/domain/onboarding/steps';

export type EntrySituation =
  | 'A_new_account_no_org'
  | 'B_invited_member'
  | 'C_sponsoro_org_crm_setup'
  | 'D_request_access'
  | 'E_resume_admin'
  | 'F_dashboard'
  | 'G_choose_organisation'
  | 'blocked_colleague_onboarding'
  | 'invitation_invalid';

export type OrganisationOnboardingSnapshot = {
  orgId: string;
  orgName: string;
  /** From `crm.organisation_settings.onboarding_completed_at` when present. */
  onboardingCompletedAt: Date | null;
  /** From `crm.onboarding_progress.current_step`. */
  currentStep: OnboardingStepSlug | null;
  completedSteps: OnboardingStepSlug[];
  skippedSteps: OnboardingStepSlug[];
  /** Another user is the in-flight CRM setup admin (O6 / O7). */
  setupStartedByUserId: string | null;
  setupStartedByName: string | null;
  /** Sponsora compliance org name for prefill (Path C). */
  sponsoroOrganisationName: string | null;
  /** CRM has any membership row (org "uses CRM"). */
  hasAnyCrmMember: boolean;
};

export type MembershipSnapshot = {
  orgId: string;
  role: CrmRole;
};

export type PendingInvitationSnapshot = {
  orgId: string;
  role: CrmRole;
  orgOnboardingComplete: boolean;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
};

export type AccessRequestSnapshot = {
  status: 'pending' | 'approved' | 'declined';
  createdAt: Date;
};

/** Server-side input to `resolveEntry` — never built in the browser. */
export type EntryContext = {
  userId: string;
  fullName: string;
  email: string;
  activeOrgId: string | null;
  memberships: MembershipSnapshot[];
  organisations: OrganisationOnboardingSnapshot[];
  pendingInvitation: PendingInvitationSnapshot | null;
  accessRequest: AccessRequestSnapshot | null;
  /** Path B profile step done (`crm.user_profile.profile_completed_at`). */
  memberProfileCompleted: boolean;
  /** Path B tour done or skipped. */
  memberTourComplete: boolean;
  /** User has SSO identity but zero CRM memberships (Path D/C discrimination). */
  hasExternalOrganisationIdentity: boolean;
};

export type EntryResolution = {
  situation: EntrySituation;
  /** Absolute in-app path to send the user to. */
  redirectTo: string;
  /** When true, `(crm)` routes must redirect away except allowlisted paths. */
  enforceOnboardingGate: boolean;
  /** Active path for step guards (admin vs member). */
  onboardingPath: 'A' | 'B' | null;
};
