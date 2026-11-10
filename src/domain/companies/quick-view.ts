import type { CompanyLifecycle } from '@/domain/companies/lifecycle';

export type CompanyQuickViewContact = {
  id: string;
  version: number;
  displayName: string;
  initials: string;
  role: string | null;
  isPrimary: boolean;
  email: string | null;
  canContactEmail: boolean;
  canContactSms: boolean;
  canContactCall: boolean;
};

export type CompanyQuickViewOpportunity = {
  id: string;
  name: string;
  valuePence: number | null;
  stageName: string;
  status: 'open' | 'won' | 'lost';
};

export type CompanyDuplicateHint = {
  id: string;
  name: string;
  domain: string | null;
  strength: 'strong' | 'weak';
};

export type CompanyQuickView = {
  id: string;
  version: number;
  displayName: string;
  name: string;
  domain: string | null;
  websiteUrl: string | null;
  industry: string | null;
  city: string | null;
  sizeBand: string | null;
  lifecycle: CompanyLifecycle;
  lifecycleSource: 'derived' | 'manual';
  owner: { id: string; fullName: string; initials: string };
  openPipelineValuePence: number;
  wonValueTotalPence: number;
  contactCount: number;
  lastActivityAt: string | null;
  createdAt: string;
  phoneE164: string | null;
  companiesHouseNumber: string | null;
  contacts: CompanyQuickViewContact[];
  opportunities: CompanyQuickViewOpportunity[];
  recentActivity: { id: string; label: string; at: string }[];
  duplicate: CompanyDuplicateHint | null;
};
