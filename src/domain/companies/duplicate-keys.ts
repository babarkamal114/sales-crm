import { normaliseCompanyName } from '@/domain/companies/normalise-company-name';
import { normaliseDomain } from '@/domain/companies/normalise-domain';

export type DuplicateMatchStrength = 'strong' | 'weak';

export type CompanyDuplicateKey =
  | { kind: 'domain'; domainNormalised: string; strength: 'strong' }
  | { kind: 'companies_house'; companiesHouseNumber: string; strength: 'strong' }
  | {
      kind: 'name_city';
      nameNormalised: string;
      city: string | null;
      strength: 'weak';
    };

export type CompanyDuplicateInput = {
  domain?: string | null;
  domainNormalised?: string | null;
  companiesHouseNumber?: string | null;
  name: string;
  city?: string | null;
};

export function findCompanyDuplicateKeys(company: CompanyDuplicateInput): CompanyDuplicateKey[] {
  const keys: CompanyDuplicateKey[] = [];

  const domain =
    company.domainNormalised ?? normaliseDomain(company.domain ?? null);
  if (domain) {
    keys.push({ kind: 'domain', domainNormalised: domain, strength: 'strong' });
  }

  const ch = company.companiesHouseNumber?.trim().toUpperCase();
  if (ch) {
    keys.push({ kind: 'companies_house', companiesHouseNumber: ch, strength: 'strong' });
  }

  const nameNormalised = normaliseCompanyName(company.name);
  if (nameNormalised) {
    keys.push({
      kind: 'name_city',
      nameNormalised,
      city: company.city?.trim().toLowerCase() || null,
      strength: 'weak',
    });
  }

  return keys;
}

export function duplicateStrengthRank(strength: DuplicateMatchStrength): number {
  return strength === 'strong' ? 2 : 1;
}
