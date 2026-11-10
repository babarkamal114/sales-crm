import { FREE_MAIL_DOMAINS } from '@/domain/companies/free-mail-domains';
import { normaliseDomain } from '@/domain/companies/normalise-domain';

export function isFreeMailDomain(domainOrEmail: string | null | undefined): boolean {
  const domain = domainOrEmail?.includes('@')
    ? normaliseDomain(domainOrEmail)
    : normaliseDomain(domainOrEmail);
  if (!domain) return false;
  return FREE_MAIL_DOMAINS.has(domain);
}
