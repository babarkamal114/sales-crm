import { z } from 'zod';
import type { CompanyMergeChoices } from '@/domain/companies/merge';

const uuid = z.string().uuid();

export const companyIdVersionSchema = z.object({
  companyId: uuid,
  version: z.number().int().min(1),
});

export const setCompanyOwnerSchema = companyIdVersionSchema.extend({
  ownerId: uuid,
});

export const setCompanyTagsSchema = companyIdVersionSchema.extend({
  tagIds: z.array(uuid).max(50),
});

export const mergeCompaniesSchema = z.object({
  primaryCompanyId: uuid,
  secondaryCompanyId: uuid,
  primaryVersion: z.number().int().min(1),
  choices: z.custom<CompanyMergeChoices>().optional(),
});

export const bulkCompanyActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('tag'),
    companyIds: z.array(uuid).min(1).max(500),
    tagIds: z.array(uuid).min(1).max(20),
    mode: z.enum(['add', 'replace']).optional().default('add'),
  }),
  z.object({
    action: z.literal('owner'),
    companyIds: z.array(uuid).min(1).max(500),
    ownerId: uuid,
  }),
  z.object({
    action: z.literal('delete'),
    companyIds: z.array(uuid).min(1).max(500),
  }),
  z.object({
    action: z.literal('export'),
    companyIds: z.array(uuid).min(1).max(500),
  }),
]);
