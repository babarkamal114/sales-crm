import { z } from 'zod';
import type { MergeChoices } from '@/domain/contacts/merge';

const uuid = z.string().uuid();

export const contactIdVersionSchema = z.object({
  contactId: uuid,
  version: z.number().int().min(1),
});

export const updateContactFieldSchema = contactIdVersionSchema.extend({
  field: z.enum([
    'firstName',
    'lastName',
    'email',
    'phone',
    'jobTitle',
    'lifecycle',
    'source',
    'recipientType',
    'socialUrl',
    'campaign',
  ]),
  value: z.union([z.string(), z.null()]),
});

export const setContactOwnerSchema = contactIdVersionSchema.extend({
  ownerId: uuid,
});

export const setContactFollowersSchema = contactIdVersionSchema.extend({
  followerUserIds: z.array(uuid).max(50),
});

export const setContactTagsSchema = contactIdVersionSchema.extend({
  tagIds: z.array(uuid).max(50),
});

export const setContactCompanySchema = contactIdVersionSchema.extend({
  companyId: uuid.nullable(),
});

export const setContactConsentSchema = contactIdVersionSchema.extend({
  channel: z.enum(['email', 'sms', 'whatsapp', 'call']),
  dnd: z.boolean().optional(),
  marketingConsent: z.enum(['granted', 'denied', 'unknown']).optional(),
  source: z.string().trim().max(200).optional(),
  wording: z.string().trim().max(2000).optional(),
  reason: z.string().trim().max(500).optional(),
});

export const mergeContactsSchema = z.object({
  primaryContactId: uuid,
  secondaryContactId: uuid,
  primaryVersion: z.number().int().min(1),
  choices: z.custom<MergeChoices>().optional(),
});

export const createOrMatchContactSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional(),
  source: z.string().trim().max(80).optional(),
  marketingConsent: z.boolean().optional(),
});

export const smartListMutationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  filters: z.record(z.string(), z.unknown()).optional().default({}),
  sort: z.record(z.string(), z.unknown()).optional().default({}),
  columns: z.array(z.unknown()).optional().default([]),
  shared: z.boolean().optional(),
});

export const eraseContactSchema = z.object({
  contactId: uuid,
  confirmDisplayName: z.string().trim().min(1).max(200),
  reason: z.string().trim().max(500).optional(),
});

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(40),
  colourKey: z.string().trim().min(1).max(20),
});

export const bulkContactActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('tag'),
    contactIds: z.array(uuid).min(1).max(500),
    tagIds: z.array(uuid).min(1).max(20),
    mode: z.enum(['add', 'replace']).optional().default('add'),
  }),
  z.object({
    action: z.literal('owner'),
    contactIds: z.array(uuid).min(1).max(500),
    ownerId: uuid,
  }),
  z.object({
    action: z.literal('follow'),
    contactIds: z.array(uuid).min(1).max(500),
  }),
  z.object({
    action: z.literal('delete'),
    contactIds: z.array(uuid).min(1).max(500),
  }),
  z.object({
    action: z.literal('export'),
    contactIds: z.array(uuid).min(1).max(500),
  }),
  z.object({
    action: z.literal('pipeline'),
    contactIds: z.array(uuid).min(1).max(500),
    pipelineId: uuid,
    stageId: uuid,
    valuePence: z.number().int().min(0).optional(),
  }),
  z.object({
    action: z.literal('email'),
    contactIds: z.array(uuid).min(1).max(500),
  }),
]);

export const updateSmartListSchema = smartListMutationSchema.extend({
  smartListId: uuid,
});

export const deleteSmartListSchema = z.object({
  smartListId: uuid,
});

export const reorderSmartListsSchema = z.object({
  orderedIds: z.array(uuid).min(1).max(50),
});

export const contactDataRequestSchema = z.object({
  contactId: uuid,
  reason: z.string().trim().max(500).optional(),
});
