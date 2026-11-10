import type { CompanyLifecycle } from '@/domain/companies/lifecycle';

export type CompanyListRow = {
  id: string;
  name: string;
  domain: string | null;
  lifecycle: CompanyLifecycle;
  industry: string | null;
  sizeBand: string | null;
  city: string | null;
  contactCount: number;
  openDealsValuePence: number;
  wonValueTotalPence: number;
  topOpenDealStage: string | null;
  owner: { id: string; fullName: string; initials: string };
  lastActivityAt: string | null;
  contactInitials: string[];
};

export type CompanyListResponse = {
  rows: CompanyListRow[];
  nextCursor: string | null;
  total: number;
  customerCount: number;
  listCounts: Record<string, number>;
};
