export type ContactEmailTemplateView = {
  id: string;
  stepKey: string;
  stepLabel: string;
  name: string;
  subject: string;
  bodyHtml: string;
  sortOrder: number;
  isSystem: boolean;
  version: number;
  updatedAt: string;
};

export type ContactEmailSendView = {
  id: string;
  subject: string;
  toAddress: string;
  status: 'sent' | 'failed' | 'skipped';
  errorMessage: string | null;
  stepKey: string | null;
  createdAt: string;
  senderName: string;
};

export type SendContactEmailResult = {
  sent: number;
  failed: number;
  skipped: number;
  skippedReasons: { contactId: string; reason: string }[];
  failures: { contactId: string; reason: string }[];
};
