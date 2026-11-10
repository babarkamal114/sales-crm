import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  GitBranch,
  Handshake,
  Plug,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import {
  ONBOARDING_STEP,
  PATH_A_ADMIN_STEPS,
  type OnboardingStepSlug,
} from '@/domain/onboarding/steps';

export type OnboardingStepDefinition = {
  slug: OnboardingStepSlug;
  label: string;
  title: string;
  description: string;
  heroHint: string;
  icon: LucideIcon;
  railTitle: string;
  railItems: readonly { label: string; detail: string }[];
};

const DEFINITIONS: Record<OnboardingStepSlug, OnboardingStepDefinition> = {
  [ONBOARDING_STEP.profile]: {
    slug: ONBOARDING_STEP.profile,
    label: 'Profile',
    title: 'Your profile',
    description: 'Tell us how to show your name across CRM.',
    heroHint: 'This helps your team recognise you on deals, notes, and activity.',
    icon: UserRound,
    railTitle: 'Why we ask',
    railItems: [
      {
        label: 'Shared context',
        detail: 'Your name appears on assignments, comments, and audit trails.',
      },
      {
        label: 'Time zone',
        detail: 'We use it for reminders and due dates in your local time.',
      },
    ],
  },
  [ONBOARDING_STEP.organisation]: {
    slug: ONBOARDING_STEP.organisation,
    label: 'Organisation',
    title: 'Organisation details',
    description: 'Confirm how your organisation appears to sponsors and your team.',
    heroHint: 'You can update branding and address later in Settings.',
    icon: Building2,
    railTitle: 'Good to know',
    railItems: [
      {
        label: 'Display name',
        detail: 'Shown on proposals, invoices, and sponsor-facing materials.',
      },
      {
        label: 'Team size',
        detail: 'Helps us tailor defaults — it is not a billing limit.',
      },
    ],
  },
  [ONBOARDING_STEP.agreements]: {
    slug: ONBOARDING_STEP.agreements,
    label: 'Agreements',
    title: 'Terms & data processing',
    description: 'Review and accept the agreements required to use CRM.',
    heroHint: 'Required once per organisation; admins accept on behalf of the team.',
    icon: FileCheck2,
    railTitle: 'What you are accepting',
    railItems: [
      {
        label: 'Terms of Service',
        detail: 'How the CRM may be used and our responsibilities to you.',
      },
      {
        label: 'Data Processing Agreement',
        detail: 'How sponsor and contact data is handled securely.',
      },
    ],
  },
  [ONBOARDING_STEP.pipeline]: {
    slug: ONBOARDING_STEP.pipeline,
    label: 'Pipeline',
    title: 'Sales pipeline',
    description: 'Start with a proven sponsorship pipeline — customise anytime.',
    heroHint: 'Stages from first conversation through to signed deal.',
    icon: GitBranch,
    railTitle: 'Default stages',
    railItems: [
      { label: 'New lead → Contacted', detail: 'Qualify fit and budget early.' },
      { label: 'Proposal sent', detail: 'Track packages and revisions.' },
      { label: 'Won / Lost', detail: 'Close the loop and learn from outcomes.' },
    ],
  },
  [ONBOARDING_STEP.leads]: {
    slug: ONBOARDING_STEP.leads,
    label: 'Leads',
    title: 'Import leads',
    description: 'Optionally bring in contacts now or add them from the dashboard.',
    heroHint: 'CSV import and enrichment are coming soon.',
    icon: Handshake,
    railTitle: 'Skip if you prefer',
    railItems: [
      {
        label: 'Add manually',
        detail: 'Create leads from the dashboard in a few clicks.',
      },
      {
        label: 'Import later',
        detail: 'Settings → Data when bulk import is available.',
      },
    ],
  },
  [ONBOARDING_STEP.team]: {
    slug: ONBOARDING_STEP.team,
    label: 'Team',
    title: 'Invite your team',
    description: 'Bring colleagues into the same pipeline and sponsor records.',
    heroHint: 'Invitations can wait until you are ready to collaborate.',
    icon: Users,
    railTitle: 'Roles at a glance',
    railItems: [
      { label: 'Admin', detail: 'Billing, settings, and full CRM access.' },
      { label: 'Manager / Member', detail: 'Work deals with scoped permissions.' },
    ],
  },
  [ONBOARDING_STEP.tools]: {
    slug: ONBOARDING_STEP.tools,
    label: 'Integrations',
    title: 'Connect tools',
    description: 'Email and calendar sync when you are ready.',
    heroHint: 'Optional — connect from Settings without blocking setup.',
    icon: Plug,
    railTitle: 'Suggested connections',
    railItems: [
      { label: 'Email', detail: 'Log sponsor threads against opportunities.' },
      { label: 'Calendar', detail: 'Surface meetings on deal timelines.' },
      { label: 'Demo mode', detail: 'Try Connect (demo) — real OAuth ships next.' },
    ],
  },
  [ONBOARDING_STEP.tour]: {
    slug: ONBOARDING_STEP.tour,
    label: 'Quick tour',
    title: 'Quick tour',
    description: 'A short walkthrough of the CRM when you land on the dashboard.',
    heroHint: 'You can replay the tour from the getting-started checklist.',
    icon: Sparkles,
    railTitle: 'What you will see',
    railItems: [
      { label: 'Dashboard', detail: 'KPIs, renewals, and tasks in one view.' },
      { label: 'Opportunities', detail: 'Move deals through your pipeline.' },
    ],
  },
  [ONBOARDING_STEP.complete]: {
    slug: ONBOARDING_STEP.complete,
    label: 'Complete',
    title: 'You are all set',
    description: 'Required setup is done — open the dashboard to start selling.',
    heroHint: 'Optional steps remain available from your getting-started checklist.',
    icon: CheckCircle2,
    railTitle: 'Next up',
    railItems: [
      { label: 'Dashboard', detail: 'Review pipeline health and renewals.' },
      { label: 'Getting started', detail: 'Finish optional setup tasks anytime.' },
    ],
  },
};

export function getOnboardingStepDefinition(
  step: OnboardingStepSlug,
): OnboardingStepDefinition {
  return DEFINITIONS[step];
}

export function getOnboardingProgressPercent(input: {
  stepIndex: number;
  stepTotal: number;
  completedSteps: readonly OnboardingStepSlug[];
}): number {
  const adminSteps = PATH_A_ADMIN_STEPS.filter((s) => s !== ONBOARDING_STEP.complete);
  if (adminSteps.length === 0) {
    return 100;
  }
  const completedWeight = input.completedSteps.filter((s) =>
    (adminSteps as readonly OnboardingStepSlug[]).includes(s),
  ).length;
  const base = (completedWeight / adminSteps.length) * 100;
  const onStep = Math.min(
    100,
    base + (1 / adminSteps.length) * 35 * (input.stepIndex / Math.max(input.stepTotal, 1)),
  );
  return Math.round(Math.min(100, Math.max(onStep, 8)));
}

export const CRM_ONBOARDING_GLANCE = [
  {
    label: 'Pipeline',
    detail: 'Move sponsorship deals from first touch to signed contract.',
  },
  {
    label: 'Contacts & opportunities',
    detail: 'One record for the sponsor, linked deals, tasks, and activity.',
  },
  {
    label: 'Integrations',
    detail: 'Connect email and calendar when you are ready — setup is optional.',
  },
] as const;

export function getUpcomingStepLabels(input: {
  currentStep: OnboardingStepSlug;
  completedSteps: readonly OnboardingStepSlug[];
}): string[] {
  const adminSteps = PATH_A_ADMIN_STEPS.filter((s) => s !== ONBOARDING_STEP.complete);
  const idx = (adminSteps as readonly OnboardingStepSlug[]).indexOf(
    input.currentStep,
  );
  const start = idx === -1 ? 0 : idx + 1;
  return adminSteps.slice(start).map((s) => DEFINITIONS[s].label);
}
