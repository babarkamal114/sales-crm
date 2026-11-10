import type { OrgOutreachSequenceSteps } from '@/domain/contacts/outreach-sequence-schemas';

export type OrgOutreachSequenceView = {
  sequenceKey: string;
  label: string;
  steps: OrgOutreachSequenceSteps;
  /** Org edited a built-in sequence template. */
  isCustomised: boolean;
  /** Created by the org (not one of the three built-in sequences). */
  isUserCreated: boolean;
};

export type ContactEmailReplyDraftView = {
  id: string;
  gmailMessageId: string;
  inboundFrom: string | null;
  inboundSubject: string | null;
  inboundPreview: string;
  draftSubject: string;
  draftHtml: string;
  status: string;
  createdAt: string;
};
