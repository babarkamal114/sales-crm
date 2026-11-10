import { normaliseDomain } from '@/domain/companies/normalise-domain';

export type CompanyNameFields = {
  name: string | null | undefined;
  domain?: string | null;
  domainNormalised?: string | null;
};

export function companyDisplayName(company: CompanyNameFields): string {
  const trimmed = company.name?.trim();
  if (trimmed) return trimmed;
  const domain = company.domainNormalised ?? normaliseDomain(company.domain);
  if (domain) return domain;
  return 'Unnamed company';
}
