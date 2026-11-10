export type WelcomeChecklistId =
  | 'finish_setup'
  | 'pipeline'
  | 'leads'
  | 'email'
  | 'calling'
  | 'stripe'
  | 'team'
  | 'profile'
  | 'tour';

export type WelcomeChecklistTemplateItem = {
  id: WelcomeChecklistId;
  label: string;
  description: string;
  hrefWhenDone: string;
  hrefWhenPending: string;
};

export const ORG_GETTING_STARTED_CHECKLIST: WelcomeChecklistTemplateItem[] = [
  {
    id: 'pipeline',
    label: 'Create a pipeline',
    description: 'Stages for moving sponsorship deals from first touch to signed.',
    hrefWhenDone: '/opportunities',
    hrefWhenPending: '#',
  },
  {
    id: 'leads',
    label: 'Import or add leads',
    description: 'Add at least one contact so your board is not empty.',
    hrefWhenDone: '/contacts',
    hrefWhenPending: '#',
  },
  {
    id: 'email',
    label: 'Connect email',
    description: 'Log sponsor threads on opportunities (Google or Microsoft).',
    hrefWhenDone: '/opportunities',
    hrefWhenPending: '#',
  },
  {
    id: 'calling',
    label: 'Connect calling',
    description: 'Click-to-call and call history on each deal.',
    hrefWhenDone: '/opportunities',
    hrefWhenPending: '#',
  },
  {
    id: 'stripe',
    label: 'Connect Stripe',
    description: 'Collect payments when deals are signed.',
    hrefWhenDone: '/opportunities',
    hrefWhenPending: '#',
  },
  {
    id: 'team',
    label: 'Invite the team',
    description: 'Bring admins, managers, and members into the same workspace.',
    hrefWhenDone: '/settings',
    hrefWhenPending: '#',
  },
];

export const MEMBER_GETTING_STARTED_CHECKLIST: WelcomeChecklistTemplateItem[] = [
  {
    id: 'profile',
    label: 'Complete your profile',
    description: 'Name, timezone, and how teammates reach you.',
    hrefWhenDone: '/settings',
    hrefWhenPending: '#',
  },
  {
    id: 'tour',
    label: 'Take the product tour',
    description: 'A quick walkthrough of dashboard and pipeline.',
    hrefWhenDone: '/',
    hrefWhenPending: '#',
  },
];

export const RECENT_ONBOARDING_MS = 30 * 86_400_000;
