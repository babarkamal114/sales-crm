export type EmailSequenceStepTemplateView = {
  id: string;
  name: string;
  subject: string;
  bodyPreview: string;
};

export type EmailSequenceStepView = {
  index: number;
  stepKey: string;
  label: string;
  status: 'done' | 'current' | 'upcoming';
  dueAt: string | null;
  reminderTitle: string;
  template: EmailSequenceStepTemplateView | null;
};

export type OutreachSequenceOptionView = {
  sequenceKey: string;
  label: string;
  isLifecycleDefault: boolean;
};

export type ContactEmailSequenceView = {
  sequenceKey: string;
  sequenceLabel: string;
  availableSequences: OutreachSequenceOptionView[];
  status: 'active' | 'paused' | 'completed' | 'replied';
  currentStepIndex: number;
  nextDueAt: string | null;
  scheduledStartAt: string | null;
  lastSentAt: string | null;
  steps: EmailSequenceStepView[];
  isOverdue: boolean;
  isCustomised: boolean;
};
