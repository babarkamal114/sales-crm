import type { DashboardScenario } from '@/domain/dashboard/schemas';
import type {
  DashboardWelcomeChecklistItem,
  DashboardWelcomeResponse,
} from '@/domain/dashboard/types';
import {
  MEMBER_GETTING_STARTED_CHECKLIST,
  ORG_GETTING_STARTED_CHECKLIST,
  RECENT_ONBOARDING_MS,
  type WelcomeChecklistId,
  type WelcomeChecklistTemplateItem,
} from '@/domain/dashboard/welcome-checklist';
import type { WelcomeOrgSnapshot } from '@/domain/dashboard/welcome-snapshot';

export type WelcomeMode =
  | 'hidden'
  | 'getting_started'
  | 'continue_onboarding'
  | 'member_getting_started'
  | 'preview';

export type WelcomeResolveInput = {
  scenario?: DashboardScenario;
  role: 'admin' | 'manager' | 'member';
  snapshot: WelcomeOrgSnapshot;
};

function checklistFromTemplate(
  template: WelcomeChecklistTemplateItem[],
  doneById: Partial<Record<WelcomeChecklistId, boolean>>,
): DashboardWelcomeChecklistItem[] {
  return template.map((item) => {
    const done = doneById[item.id] ?? false;
    return {
      id: item.id,
      label: item.label,
      description: item.description,
      done,
      href: done ? item.hrefWhenDone : '#',
      inlineSetup: !done,
    };
  });
}

function withProgress(
  response: Omit<DashboardWelcomeResponse, 'progress'>,
): DashboardWelcomeResponse {
  const total = response.checklist.length;
  const completed = response.checklist.filter((c) => c.done).length;
  return {
    ...response,
    progress: { completed, total },
  };
}

function orgDoneMap(snapshot: WelcomeOrgSnapshot): Partial<Record<WelcomeChecklistId, boolean>> {
  const teamDone =
    snapshot.activeMemberCount > 1 ||
    snapshot.pendingInviteCount > 0;

  return {
    pipeline: snapshot.hasDefaultPipeline,
    leads: snapshot.contactCount > 0,
    email: snapshot.emailConnected,
    calling: snapshot.callingConnected,
    stripe: snapshot.stripeConnected,
    team: teamDone,
  };
}

function memberDoneMap(snapshot: WelcomeOrgSnapshot): Partial<Record<WelcomeChecklistId, boolean>> {
  return {
    profile: Boolean(snapshot.profileCompletedAt),
    tour: Boolean(snapshot.tourCompletedAt),
  };
}

function isRecentlyOnboarded(completedAt: Date | null): boolean {
  if (!completedAt) return false;
  return Date.now() - completedAt.getTime() < RECENT_ONBOARDING_MS;
}

export function resolveWelcomeResponse(input: WelcomeResolveInput): DashboardWelcomeResponse {
  const { scenario, role, snapshot } = input;

  if (scenario === 'new-org') {
    return withProgress({
      showWelcome: true,
      mode: 'preview',
      title: 'Welcome to CRM',
      subtitle:
        'Set up the basics below on Getting started. Each step expands in place and ticks off when you are done.',
      checklist: checklistFromTemplate(ORG_GETTING_STARTED_CHECKLIST, {}),
    });
  }

  if (scenario === 'empty') {
    return withProgress({
      showWelcome: true,
      mode: 'preview',
      title: 'Welcome to CRM',
      subtitle: 'Your workspace is ready — complete these steps to start selling.',
      checklist: checklistFromTemplate(ORG_GETTING_STARTED_CHECKLIST, {}),
    });
  }

  if (scenario === 'populated' || scenario === 'module-unavailable') {
    return withProgress({
      showWelcome: false,
      mode: 'hidden',
      title: '',
      subtitle: '',
      checklist: [],
    });
  }

  if (scenario === 'member') {
    return withProgress({
      showWelcome: true,
      mode: 'preview',
      title: 'Welcome to your workspace',
      subtitle: 'Finish your personal setup to get the most from CRM.',
      checklist: checklistFromTemplate(MEMBER_GETTING_STARTED_CHECKLIST, {
        profile: false,
        tour: false,
      }),
    });
  }

  if (scenario === 'stripe-disconnected' || scenario === 'error-kpis' || scenario === 'slow-pipeline') {
    return withProgress({
      showWelcome: false,
      mode: 'hidden',
      title: '',
      subtitle: '',
      checklist: [],
    });
  }

  if (!snapshot.onboardingCompletedAt) {
    const doneMap = orgDoneMap(snapshot);
    const checklist = checklistFromTemplate(ORG_GETTING_STARTED_CHECKLIST, doneMap);

    return withProgress({
      showWelcome: true,
      mode: 'continue_onboarding',
      title: 'Finish organisation setup',
      subtitle:
        'Complete these steps on Getting started — no need to return to the onboarding wizard.',
      checklist,
    });
  }

  if (role === 'member') {
    const doneMap = memberDoneMap(snapshot);
    const checklist = checklistFromTemplate(MEMBER_GETTING_STARTED_CHECKLIST, doneMap);
    const allDone = checklist.every((c) => c.done);
    if (allDone) {
      return withProgress({
        showWelcome: false,
        mode: 'hidden',
        title: '',
        subtitle: '',
        checklist: [],
      });
    }
    return withProgress({
      showWelcome: true,
      mode: 'member_getting_started',
      title: 'Welcome to CRM',
      subtitle: 'Complete these personal steps — your admin has already configured the org.',
      checklist,
    });
  }

  const recently = isRecentlyOnboarded(snapshot.onboardingCompletedAt);
  const doneMap = orgDoneMap(snapshot);
  const checklist = checklistFromTemplate(ORG_GETTING_STARTED_CHECKLIST, doneMap);
  const allDone = checklist.every((c) => c.done);

  if (!recently || allDone) {
    return withProgress({
      showWelcome: false,
      mode: 'hidden',
      title: '',
      subtitle: '',
      checklist: [],
    });
  }

  return withProgress({
    showWelcome: true,
    mode: 'getting_started',
    title: 'Welcome to CRM',
    subtitle:
      'Set up the basics below. Each step links to the right place and ticks off when you are done.',
    checklist,
  });
}
