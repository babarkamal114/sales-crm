import { z } from 'zod';
import { isValidCompaniesHouseNumber, normaliseCompaniesHouseNumber } from '@/domain/companies/companies-house-number';
import {
  COMPANY_LIFECYCLE_OPTIONS,
  COMPANY_RECIPIENT_OPTIONS,
  COMPANY_SIZE_BANDS,
} from '@/domain/companies/form-constants';
import { isFreeMailDomain } from '@/domain/companies/is-free-mail-domain';
import { isValidLinkedInCompanyUrl } from '@/domain/companies/linkedin-url';
import { normaliseDomain } from '@/domain/companies/normalise-domain';
import { isValidUkPostcode } from '@/domain/companies/uk-postcode';
import { normalisePhone } from '@/domain/contacts/normalise';

const sizeBandValues = COMPANY_SIZE_BANDS.map((row) => row.value);
const lifecycleValues = COMPANY_LIFECYCLE_OPTIONS.map((row) => row.value);
const recipientValues = COMPANY_RECIPIENT_OPTIONS.map((row) => row.value);

function optionalDomainField(label: string) {
  return z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(''))
    .superRefine((value, ctx) => {
      if (!value) return;
      const domain = normaliseDomain(value);
      if (!domain) {
        ctx.addIssue({ code: 'custom', message: `Enter a valid ${label}.` });
        return;
      }
      if (isFreeMailDomain(domain)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Personal email domains (Gmail, Outlook, etc.) cannot be used as a company website.',
        });
      }
    });
}

export const createCompanySchema = z
  .object({
    name: z.string().trim().min(2, 'Company name must be at least 2 characters.').max(200),
    website: optionalDomainField('website or domain'),
    phone: z.string().trim().max(40).optional().or(z.literal('')),
    industry: z.string().trim().max(80).optional().or(z.literal('')),
    sizeBand: z
      .union([z.enum(sizeBandValues as [string, ...string[]]), z.literal('')])
      .optional()
      .transform((v) => (v && v !== '' ? v : undefined)),
    ownerId: z.string().uuid().optional(),
    lifecycle: z.enum(lifecycleValues as [string, ...string[]]).optional().default('prospect'),
    addressLine1: z.string().trim().max(200).optional().or(z.literal('')),
    addressLine2: z.string().trim().max(200).optional().or(z.literal('')),
    city: z.string().trim().max(80).optional().or(z.literal('')),
    postcode: z.string().trim().max(16).optional().or(z.literal('')),
    country: z.string().trim().max(2).optional().default('GB'),
    companiesHouseNumber: z.string().trim().max(16).optional().or(z.literal('')),
    extraDomains: z.array(z.string().trim().max(200)).optional().default([]),
    linkedinUrl: z.string().trim().max(300).optional().or(z.literal('')),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    parentCompanyId: z.string().uuid().optional().nullable(),
    recipientType: z.enum(recipientValues as [string, ...string[]]).optional().default('corporate'),
    tagIds: z.array(z.string().uuid()).optional().default([]),
    followerIds: z.array(z.string().uuid()).optional().default([]),
    forceCreate: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.country === 'GB' && data.postcode && !isValidUkPostcode(data.postcode)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid UK postcode.',
        path: ['postcode'],
      });
    }
    if (data.companiesHouseNumber && !isValidCompaniesHouseNumber(data.companiesHouseNumber)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Companies House number must be 8 digits or 2 letters and 6 digits.',
        path: ['companiesHouseNumber'],
      });
    }
    if (data.linkedinUrl && !isValidLinkedInCompanyUrl(data.linkedinUrl)) {
      ctx.addIssue({
        code: 'custom',
        message: 'LinkedIn URL must be a linkedin.com/company/… address.',
        path: ['linkedinUrl'],
      });
    }
    const phone = data.phone?.trim();
    if (phone && !normalisePhone(phone)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid phone number.',
        path: ['phone'],
      });
    }
    for (const raw of data.extraDomains ?? []) {
      const domain = normaliseDomain(raw);
      if (!domain) {
        ctx.addIssue({
          code: 'custom',
          message: `Invalid domain: ${raw}`,
          path: ['extraDomains'],
        });
      } else if (isFreeMailDomain(domain)) {
        ctx.addIssue({
          code: 'custom',
          message: `Personal email domain not allowed: ${domain}`,
          path: ['extraDomains'],
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    companiesHouseNumber: data.companiesHouseNumber
      ? normaliseCompaniesHouseNumber(data.companiesHouseNumber)
      : '',
    phone: data.phone?.trim() ? (normalisePhone(data.phone.trim()) ?? data.phone.trim()) : '',
    websiteDomain: data.website ? normaliseDomain(data.website) : null,
    extraDomainsNormalised: (data.extraDomains ?? [])
      .map((d) => normaliseDomain(d))
      .filter((d): d is string => Boolean(d)),
  }));

export const updateCompanyFieldSchema = z.object({
  companyId: z.string().uuid(),
  version: z.number().int().min(1),
  field: z.enum([
    'name',
    'domain',
    'phone',
    'addressLine1',
    'addressLine2',
    'city',
    'postcode',
    'country',
    'industry',
    'sizeBand',
    'description',
    'linkedinUrl',
    'companiesHouseNumber',
    'websiteUrl',
    'lifecycle',
  ]),
  value: z.union([z.string(), z.null()]),
});

export type CreateCompanyInput = z.input<typeof createCompanySchema>;
export type CreateCompanyPayload = z.output<typeof createCompanySchema>;

export const updateCompanyDetailsSchema = z
  .object({
    companyId: z.string().uuid(),
    version: z.number().int().min(1),
    name: z.string().trim().min(2, 'Company name must be at least 2 characters.').max(200),
    website: optionalDomainField('website or domain'),
    phone: z.string().trim().max(40).optional().or(z.literal('')),
    industry: z.string().trim().max(80).optional().or(z.literal('')),
    sizeBand: z
      .union([z.enum(sizeBandValues as [string, ...string[]]), z.literal('')])
      .optional()
      .transform((v) => (v && v !== '' ? v : undefined)),
    ownerId: z.string().uuid(),
    lifecycle: z.enum(lifecycleValues as [string, ...string[]]),
    addressLine1: z.string().trim().max(200).optional().or(z.literal('')),
    addressLine2: z.string().trim().max(200).optional().or(z.literal('')),
    city: z.string().trim().max(80).optional().or(z.literal('')),
    postcode: z.string().trim().max(16).optional().or(z.literal('')),
    country: z.string().trim().max(2).optional().default('GB'),
    companiesHouseNumber: z.string().trim().max(16).optional().or(z.literal('')),
    linkedinUrl: z.string().trim().max(300).optional().or(z.literal('')),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    tagIds: z.array(z.string().uuid()).max(50).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.country === 'GB' && data.postcode && !isValidUkPostcode(data.postcode)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid UK postcode.',
        path: ['postcode'],
      });
    }
    if (data.companiesHouseNumber && !isValidCompaniesHouseNumber(data.companiesHouseNumber)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Companies House number must be 8 digits or 2 letters and 6 digits.',
        path: ['companiesHouseNumber'],
      });
    }
    if (data.linkedinUrl && !isValidLinkedInCompanyUrl(data.linkedinUrl)) {
      ctx.addIssue({
        code: 'custom',
        message: 'LinkedIn URL must be a linkedin.com/company/… address.',
        path: ['linkedinUrl'],
      });
    }
    const phone = data.phone?.trim();
    if (phone && !normalisePhone(phone)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid phone number.',
        path: ['phone'],
      });
    }
  })
  .transform((data) => ({
    ...data,
    companiesHouseNumber: data.companiesHouseNumber
      ? normaliseCompaniesHouseNumber(data.companiesHouseNumber)
      : '',
    phone: data.phone?.trim() ? (normalisePhone(data.phone.trim()) ?? data.phone.trim()) : '',
    websiteDomain: data.website ? normaliseDomain(data.website) : null,
    domainDisplay: data.website ? normaliseDomain(data.website) : null,
  }));

export type UpdateCompanyDetailsPayload = z.output<typeof updateCompanyDetailsSchema>;

export const linkContactToCompanySchema = z.object({
  contactId: z.string().uuid(),
  companyId: z.string().uuid(),
  version: z.number().int().min(1),
  isPrimary: z.boolean().optional(),
  role: z.string().trim().max(120).optional(),
});

export const unlinkContactFromCompanySchema = z.object({
  contactId: z.string().uuid(),
  companyId: z.string().uuid(),
  version: z.number().int().min(1),
});

export const updateContactCompanyRoleSchema = z.object({
  contactId: z.string().uuid(),
  companyId: z.string().uuid(),
  version: z.number().int().min(1),
  role: z.string().trim().max(120).optional().or(z.literal('')),
});

export const updateOrgCrmSettingsSchema = z.object({
  autoLinkContactsByEmailDomain: z.boolean().optional(),
  collectContactDateOfBirth: z.boolean().optional(),
});
