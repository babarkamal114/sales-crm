/** Ordered email cadence per lifecycle — step keys must match email templates. */
export type OutreachSequenceStep = {
  stepKey: string;
  label: string;
  /** Days after the previous step was sent (0 for the first step). */
  daysAfterPrevious: number;
  reminderTitle: string;
};

export type OutreachSequenceDefinition = {
  key: string;
  label: string;
  lifecycle: string | string[];
  steps: OutreachSequenceStep[];
};

export const OUTREACH_SEQUENCES: OutreachSequenceDefinition[] = [
  {
    key: 'lead_outreach',
    label: 'Lead outreach',
    lifecycle: 'lead',
    steps: [
      {
        stepKey: 'lead_intro',
        label: 'First introduction',
        daysAfterPrevious: 0,
        reminderTitle: 'Send first introduction email',
      },
      {
        stepKey: 'lead_follow_up',
        label: 'Follow-up',
        daysAfterPrevious: 3,
        reminderTitle: 'Send follow-up email',
      },
      {
        stepKey: 'lead_meeting',
        label: 'Meeting request',
        daysAfterPrevious: 4,
        reminderTitle: 'Send meeting request email',
      },
      {
        stepKey: 'proposal_sent',
        label: 'Proposal',
        daysAfterPrevious: 7,
        reminderTitle: 'Send proposal email',
      },
    ],
  },
  {
    key: 'customer_outreach',
    label: 'Customer nurture',
    lifecycle: 'customer',
    steps: [
      {
        stepKey: 'customer_welcome',
        label: 'Welcome',
        daysAfterPrevious: 0,
        reminderTitle: 'Send welcome email',
      },
      {
        stepKey: 'customer_check_in',
        label: 'Check-in',
        daysAfterPrevious: 14,
        reminderTitle: 'Send check-in email',
      },
    ],
  },
  {
    key: 'former_customer_outreach',
    label: 'Win back',
    lifecycle: 'former_customer',
    steps: [
      {
        stepKey: 'former_win_back',
        label: 'Reconnect',
        daysAfterPrevious: 0,
        reminderTitle: 'Send win-back email',
      },
    ],
  },
];

export function outreachSequenceForLifecycle(lifecycle: string): OutreachSequenceDefinition {
  const match = OUTREACH_SEQUENCES.find((s) =>
    Array.isArray(s.lifecycle) ? s.lifecycle.includes(lifecycle) : s.lifecycle === lifecycle,
  );
  return match ?? OUTREACH_SEQUENCES[0]!;
}

export function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}
