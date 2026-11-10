import type { CanContactSummary } from '@/domain/contacts/consent';

export type ContactListRow = {
  id: string;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
  phoneE164: string | null;
  companyName: string | null;
  owner: { id: string; fullName: string; initials: string };
  tags: { id: string; name: string; colourKey: string }[];
  source: string | null;
  openDeal: {
    id: string;
    name: string;
    valuePence: number | null;
    stageName: string;
    status: 'open' | 'won' | 'lost';
  } | null;
  canContact: CanContactSummary;
  lastActivityAt: string | null;
  createdAt: string;
  isStaleActivity: boolean;
};

export type ContactListResponse = {
  rows: ContactListRow[];
  nextCursor: string | null;
  totalApprox: number | null;
};

export type ContactListSummary = {
  total: number;
  addedThisWeek: number;
  smartListCounts: Record<string, number>;
};
