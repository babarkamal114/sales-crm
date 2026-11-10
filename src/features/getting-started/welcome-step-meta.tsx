import {
  CreditCard,
  Kanban,
  Mail,
  Map,
  Phone,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { WelcomeChecklistId } from '@/domain/dashboard/welcome-checklist';

export type WelcomeStepMeta = {
  icon: LucideIcon;
  shortLabel: string;
  tip: string;
};

export const WELCOME_STEP_META: Record<WelcomeChecklistId, WelcomeStepMeta> = {
  finish_setup: {
    icon: Map,
    shortLabel: 'Setup',
    tip: 'Finish the remaining organisation steps in order.',
  },
  pipeline: {
    icon: Kanban,
    shortLabel: 'Pipeline',
    tip: 'Default stages match how sponsorship teams usually sell — you can customise later.',
  },
  leads: {
    icon: UserPlus,
    shortLabel: 'Leads',
    tip: 'One contact plus an opportunity is enough to light up your board.',
  },
  email: {
    icon: Mail,
    shortLabel: 'Email',
    tip: 'Connect the inbox your team already uses for sponsor conversations.',
  },
  calling: {
    icon: Phone,
    shortLabel: 'Calling',
    tip: 'Twilio powers click-to-call and call history on each deal.',
  },
  stripe: {
    icon: CreditCard,
    shortLabel: 'Payments',
    tip: 'Stripe Connect lets you collect fees when deals are signed.',
  },
  team: {
    icon: Users,
    shortLabel: 'Team',
    tip: 'Invites stay pending until teammates accept — resend anytime.',
  },
  profile: {
    icon: User,
    shortLabel: 'Profile',
    tip: 'Timezone and phone help teammates and reminders reach you.',
  },
  tour: {
    icon: Map,
    shortLabel: 'Tour',
    tip: 'Walk through dashboard, pipeline, and contacts at your pace.',
  },
};

export function stepMeta(id: string): WelcomeStepMeta {
  return WELCOME_STEP_META[id as WelcomeChecklistId] ?? WELCOME_STEP_META.pipeline;
}
