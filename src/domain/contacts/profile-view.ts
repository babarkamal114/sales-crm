import type { ContactQuickView } from '@/domain/contacts/quick-view';

export type ContactFollowerView = {
  id: string;
  fullName: string;
  initials: string;
};

export type ContactOpportunityLeadView = ContactQuickView['opportunities'][number] & {
  pipelineId: string;
  pipelineName: string;
};

export type ContactAttributionView = {
  touch: 'first' | 'latest';
  source: string | null;
  medium: string | null;
  campaign: string | null;
  form: string | null;
  pageUrl: string | null;
  capturedAt: string;
};

export type ContactProfile = Omit<ContactQuickView, 'opportunities'> & {
  firstName: string;
  lastName: string;
  lifecycle: string;
  campaign: string | null;
  socialUrl: string | null;
  recipientType: string;
  phoneType: string | null;
  followers: ContactFollowerView[];
  opportunities: ContactOpportunityLeadView[];
  attribution: ContactAttributionView[];
};

export type ContactActivityItem = {
  id: string;
  kind: 'note' | 'task' | 'stage_move' | 'email' | 'created';
  label: string;
  at: string;
};

export type ContactActivityFeed = {
  items: ContactActivityItem[];
  attribution: ContactAttributionView[];
};
