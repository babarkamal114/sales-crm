import { describe, expect, it } from 'vitest';
import { companyDisplayName } from '@/domain/companies/display-name';
import { findCompanyDuplicateKeys } from '@/domain/companies/duplicate-keys';
import { isFreeMailDomain } from '@/domain/companies/is-free-mail-domain';
import { deriveLifecycle } from '@/domain/companies/lifecycle';
import { mergeCompanies } from '@/domain/companies/merge';
import { normaliseCompanyName } from '@/domain/companies/normalise-company-name';
import { normaliseDomain } from '@/domain/companies/normalise-domain';

describe('normaliseDomain', () => {
  it('strips protocol, www, path and port', () => {
    expect(normaliseDomain('https://www.Cedar-Legal.example/about')).toBe('cedar-legal.example');
  });

  it('accepts email addresses', () => {
    expect(normaliseDomain('Person@Sub.Example.co.uk')).toBe('sub.example.co.uk');
  });

  it('rejects invalid input', () => {
    expect(normaliseDomain('not a domain')).toBeNull();
    expect(normaliseDomain('')).toBeNull();
  });
});

describe('isFreeMailDomain', () => {
  it('flags gmail', () => {
    expect(isFreeMailDomain('user@gmail.com')).toBe(true);
  });

  it('allows corporate domains', () => {
    expect(isFreeMailDomain('user@cedar-legal.example')).toBe(false);
  });
});

describe('normaliseCompanyName', () => {
  it('removes legal suffixes', () => {
    expect(normaliseCompanyName('Cedar Legal LLP')).toBe('cedar legal');
    expect(normaliseCompanyName('Cedar Legal')).toBe('cedar legal');
  });
});

describe('findCompanyDuplicateKeys', () => {
  it('returns domain, companies house and weak name+city keys', () => {
    const keys = findCompanyDuplicateKeys({
      name: 'Acme Ltd',
      domain: 'acme.example',
      companiesHouseNumber: '12345678',
      city: 'Leeds',
    });
    expect(keys.map((k) => k.kind)).toEqual(['domain', 'companies_house', 'name_city']);
  });
});

describe('deriveLifecycle', () => {
  it('does not overwrite manual lifecycle', () => {
    expect(
      deriveLifecycle([{ status: 'won' }], 'not_a_fit', 'manual'),
    ).toBe('not_a_fit');
  });

  it('becomes customer when a deal is won', () => {
    expect(deriveLifecycle([{ status: 'won' }], 'prospect', 'derived')).toBe('customer');
  });

  it('former customer when customer has only lost deals', () => {
    expect(
      deriveLifecycle([{ status: 'lost' }], 'customer', 'derived'),
    ).toBe('former_customer');
  });
});

describe('mergeCompanies', () => {
  const primary = {
    id: 'a',
    name: 'Primary Co',
    domain: 'primary.example',
    websiteUrl: null,
    phoneE164: null,
    addressLine1: null,
    addressLine2: null,
    city: 'London',
    postcode: null,
    country: 'GB',
    industry: null,
    sizeBand: null,
    companiesHouseNumber: null,
    description: null,
    linkedinUrl: null,
    ownerId: 'u1',
    lifecycle: 'prospect',
  };
  const secondary = {
    ...primary,
    id: 'b',
    name: 'Secondary Co',
    domain: 'secondary.example',
    city: 'Manchester',
  };

  it('picks field choices', () => {
    const result = mergeCompanies(primary, secondary, { name: 'secondary' }, {
      contacts: 2,
      opportunities: 1,
      tasks: 0,
      notes: 0,
      documents: 0,
      domains: 1,
      tags: 0,
      followers: 0,
      customFieldValues: 0,
      activityEvents: 0,
    });
    expect(result.merged.name).toBe('Secondary Co');
    expect(result.relatedRecordsToMove.contacts).toBe(2);
  });
});

describe('companyDisplayName', () => {
  it('falls back to domain then unnamed', () => {
    expect(companyDisplayName({ name: '  ' })).toBe('Unnamed company');
    expect(companyDisplayName({ name: '', domain: 'acme.example' })).toBe('acme.example');
  });
});
