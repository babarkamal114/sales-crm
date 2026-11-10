import { z } from 'zod';
import { isValidUkPostcode } from '@/domain/companies/uk-postcode';
import { isValidLinkedInProfileUrl } from '@/domain/contacts/linkedin-profile-url';
import { CONSENT_SOURCE_OPTIONS, CONTACT_LEAD_SOURCE_OPTIONS } from '@/domain/contacts/form-constants';

const lifecycleValues = ['lead', 'customer', 'former_customer', 'not_a_fit'] as const;
const leadSourceValues = CONTACT_LEAD_SOURCE_OPTIONS.map((row) => row.value);
const consentSourceValues = CONSENT_SOURCE_OPTIONS.map((row) => row.value);

const channelConsentInputSchema = z.object({
  marketingConsent: z.enum(['unknown', 'granted', 'denied']).optional().default('unknown'),
  dnd: z.boolean().optional().default(false),
  dndReason: z.string().trim().max(500).optional().or(z.literal('')),
});

export const createContactConsentSchema = z.object({
  channels: z
    .object({
      email: channelConsentInputSchema.optional(),
      sms: channelConsentInputSchema.optional(),
      whatsapp: channelConsentInputSchema.optional(),
      call: channelConsentInputSchema.optional(),
    })
    .optional(),
  source: z.enum(consentSourceValues as [string, ...string[]]).optional(),
  wording: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const createContactNewCompanySchema = z.object({
  name: z.string().trim().min(2).max(200),
  website: z.string().trim().max(200).optional().or(z.literal('')),
});

export const createContactNewOpportunitySchema = z.object({
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  name: z.string().trim().max(200).optional().or(z.literal('')),
  valueGbp: z.string().optional().or(z.literal('')),
  expectedCloseDate: z.string().optional().or(z.literal('')),
});

export const createContactSchema = z
  .object({
    id: z.string().uuid().optional(),
    firstName: z.string().trim().max(100).optional().or(z.literal('')),
    lastName: z.string().trim().max(100).optional().or(z.literal('')),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    secondaryEmail: z.string().trim().email().optional().or(z.literal('')),
    secondaryPhone: z.string().trim().max(30).optional().or(z.literal('')),
    jobTitle: z.string().trim().max(120).optional().or(z.literal('')),
    companyId: z.string().uuid().optional(),
    newCompany: createContactNewCompanySchema.optional(),
    newOpportunity: createContactNewOpportunitySchema.optional(),
    ownerId: z.string().uuid().optional(),
    lifecycle: z.enum(lifecycleValues).optional().default('lead'),
    source: z.enum(leadSourceValues as [string, ...string[]]).optional().default('Manual'),
    campaign: z.string().trim().max(120).optional().or(z.literal('')),
    recipientType: z.enum(['individual', 'corporate']).optional().default('individual'),
    linkedinUrl: z.string().trim().max(300).optional().or(z.literal('')),
    addressLine1: z.string().trim().max(200).optional().or(z.literal('')),
    addressLine2: z.string().trim().max(200).optional().or(z.literal('')),
    city: z.string().trim().max(80).optional().or(z.literal('')),
    postcode: z.string().trim().max(16).optional().or(z.literal('')),
    country: z.string().trim().max(2).optional().default('GB'),
    dateOfBirth: z.string().trim().optional().or(z.literal('')),
    tagIds: z.array(z.string().uuid()).optional().default([]),
    followerIds: z.array(z.string().uuid()).optional().default([]),
    note: z.string().trim().max(5000).optional().or(z.literal('')),
    consent: createContactConsentSchema.optional(),
    marketingConsent: z.boolean().optional(),
    forceCreate: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.companyId && data.newCompany) {
      ctx.addIssue({
        code: 'custom',
        message: 'Choose an existing company or create a new one, not both.',
        path: ['companyId'],
      });
    }

    const first = data.firstName?.trim() ?? '';
    const last = data.lastName?.trim() ?? '';
    if (!first && !last) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a first or last name.',
        path: ['firstName'],
      });
    }

    const email = data.email?.trim() ?? '';
    const phone = data.phone?.trim() ?? '';
    const secondaryEmail = data.secondaryEmail?.trim() ?? '';
    const secondaryPhone = data.secondaryPhone?.trim() ?? '';
    if (!email && !phone && !secondaryEmail && !secondaryPhone) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter an email or phone number.',
        path: ['email'],
      });
    }

    if (data.country === 'GB' && data.postcode?.trim() && !isValidUkPostcode(data.postcode)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid UK postcode.',
        path: ['postcode'],
      });
    }

    if (data.linkedinUrl?.trim() && !isValidLinkedInProfileUrl(data.linkedinUrl)) {
      ctx.addIssue({
        code: 'custom',
        message: 'LinkedIn URL must be a linkedin.com/in/ profile link.',
        path: ['linkedinUrl'],
      });
    }

    const channels = data.consent?.channels ?? {};
    const channelRows = ['email', 'sms', 'whatsapp', 'call'] as const;
    let anyGranted = false;
    for (const key of channelRows) {
      const row = channels[key];
      if (row?.marketingConsent === 'granted') anyGranted = true;
      if (row?.dnd && !row.dndReason?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Enter a reason when do-not-contact is on.',
          path: ['consent', 'channels', key, 'dndReason'],
        });
      }
    }
    if (anyGranted) {
      if (!data.consent?.source) {
        ctx.addIssue({
          code: 'custom',
          message: 'Select how consent was collected.',
          path: ['consent', 'source'],
        });
      }
      if (!data.consent?.wording?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Enter the consent wording the person agreed to.',
          path: ['consent', 'wording'],
        });
      }
    }
  });

export type CreateContactInput = z.input<typeof createContactSchema>;
export type CreateContactPayload = z.output<typeof createContactSchema>;
