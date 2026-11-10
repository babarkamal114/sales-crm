import { isFreeMailDomain } from '@/domain/companies/is-free-mail-domain';
import { normaliseDomain } from '@/domain/companies/normalise-domain';

export function emailDomainForCompanyMatch(email: string | null | undefined): string | null {
  if (!email?.includes('@')) return null;
  const domain = normaliseDomain(email);
  if (!domain || isFreeMailDomain(domain)) return null;
  return domain;
}

/** Display name suggestion when creating a company from a domain (e.g. cedar.co.uk → Cedar). */
export function companyNameFromDomain(domain: string): string {
  const label = domain.split('.')[0] ?? domain;
  return label
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
