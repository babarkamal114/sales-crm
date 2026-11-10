import type {
  CompanyDuplicateHint,
  CompanyQuickViewContact,
  CompanyQuickViewOpportunity,
} from '@/domain/companies/quick-view';
import type { CompanyLifecycle } from '@/domain/companies/lifecycle';

export type CompanyDetailTag = {
  id: string;
  name: string;
  colourKey: string;
};

export type CompanyDetailDomain = {
  domainNormalised: string;
  isPrimary: boolean;
};

export type CompanyDetailOpportunity = CompanyQuickViewOpportunity & {
  contactName: string | null;
};

export type CompanyDetail = {
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
  addressLine1: string | null;
  addressLine2: string | null;
  postcode: string | null;
  country: string;
  description: string | null;
  linkedinUrl: string | null;
  recipientType: string;
  tags: CompanyDetailTag[];
  extraDomains: CompanyDetailDomain[];
  parentCompany: { id: string; name: string } | null;
  contacts: CompanyQuickViewContact[];
  opportunities: CompanyDetailOpportunity[];
  recentActivity: { id: string; label: string; at: string }[];
  duplicate: CompanyDuplicateHint | null;
};
