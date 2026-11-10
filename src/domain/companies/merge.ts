import { companyDisplayName } from '@/domain/companies/display-name';

export type MergeFieldChoice = 'primary' | 'secondary';

export type CompanyMergeChoices = Partial<
  Record<
    | 'name'
    | 'domain'
    | 'websiteUrl'
    | 'phoneE164'
    | 'addressLine1'
    | 'addressLine2'
    | 'city'
    | 'postcode'
    | 'country'
    | 'industry'
    | 'sizeBand'
    | 'companiesHouseNumber'
    | 'description'
    | 'linkedinUrl'
    | 'ownerId'
    | 'lifecycle',
    MergeFieldChoice
  >
>;

export type CompanyMergeSnapshot = {
  id: string;
  name: string;
  domain: string | null;
  websiteUrl: string | null;
  phoneE164: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  country: string;
  industry: string | null;
  sizeBand: string | null;
  companiesHouseNumber: string | null;
  description: string | null;
  linkedinUrl: string | null;
  ownerId: string;
  lifecycle: string;
};

export type CompanyMergeMoveCounts = {
  contacts: number;
  opportunities: number;
  tasks: number;
  notes: number;
  documents: number;
  domains: number;
  tags: number;
  followers: number;
  customFieldValues: number;
  activityEvents: number;
};

export type MergeCompaniesResult = {
  merged: CompanyMergeSnapshot & { displayName: string };
  relatedRecordsToMove: CompanyMergeMoveCounts;
};

function pickField<T>(
  field: keyof CompanyMergeChoices,
  choices: CompanyMergeChoices,
  primary: T,
  secondary: T,
): T {
  return choices[field] === 'secondary' ? secondary : primary;
}

export function mergeCompanies(
  primary: CompanyMergeSnapshot,
  secondary: CompanyMergeSnapshot,
  choices: CompanyMergeChoices,
  moveCounts: CompanyMergeMoveCounts,
): MergeCompaniesResult {
  const merged: CompanyMergeSnapshot = {
    id: primary.id,
    name: pickField('name', choices, primary.name, secondary.name),
    domain: pickField('domain', choices, primary.domain, secondary.domain),
    websiteUrl: pickField('websiteUrl', choices, primary.websiteUrl, secondary.websiteUrl),
    phoneE164: pickField('phoneE164', choices, primary.phoneE164, secondary.phoneE164),
    addressLine1: pickField('addressLine1', choices, primary.addressLine1, secondary.addressLine1),
    addressLine2: pickField('addressLine2', choices, primary.addressLine2, secondary.addressLine2),
    city: pickField('city', choices, primary.city, secondary.city),
    postcode: pickField('postcode', choices, primary.postcode, secondary.postcode),
    country: pickField('country', choices, primary.country, secondary.country),
    industry: pickField('industry', choices, primary.industry, secondary.industry),
    sizeBand: pickField('sizeBand', choices, primary.sizeBand, secondary.sizeBand),
    companiesHouseNumber: pickField(
      'companiesHouseNumber',
      choices,
      primary.companiesHouseNumber,
      secondary.companiesHouseNumber,
    ),
    description: pickField('description', choices, primary.description, secondary.description),
    linkedinUrl: pickField('linkedinUrl', choices, primary.linkedinUrl, secondary.linkedinUrl),
    ownerId: pickField('ownerId', choices, primary.ownerId, secondary.ownerId),
    lifecycle: pickField('lifecycle', choices, primary.lifecycle, secondary.lifecycle),
  };

  return {
    merged: {
      ...merged,
      displayName: companyDisplayName(merged),
    },
    relatedRecordsToMove: moveCounts,
  };
}
