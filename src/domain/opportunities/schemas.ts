import { z } from 'zod';
import {
  OPPORTUNITY_PRIORITY_OPTIONS,
  OPPORTUNITY_SOURCE_OPTIONS,
  OPPORTUNITY_VALUE_TYPE_OPTIONS,
} from '@/domain/opportunities/form-constants';

const valueTypeValues = OPPORTUNITY_VALUE_TYPE_OPTIONS.map((row) => row.value);
const priorityValues = OPPORTUNITY_PRIORITY_OPTIONS.map((row) => row.value);
const sourceValues = OPPORTUNITY_SOURCE_OPTIONS.map((row) => row.value);

function parseGbpToPence(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  const normalised = raw.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return undefined;
  return Math.round(Number(normalised) * 100);
}

export const createOpportunitySchema = z
  .object({
    id: z.string().uuid().optional(),
    contactId: z.string().uuid(),
    companyId: z.string().uuid().optional().nullable(),
    pipelineId: z.string().uuid(),
    stageId: z.string().uuid(),
    name: z.string().trim().min(1, 'Deal name is required.').max(200),
    valueGbp: z.string().trim().optional().or(z.literal('')),
    valuePence: z.coerce.number().int().min(0).optional(),
    valueType: z.enum(valueTypeValues as [string, ...string[]]).optional().default('one_off'),
    currency: z.string().trim().length(3).optional().default('GBP'),
    ownerId: z.string().uuid().optional(),
    expectedCloseDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal('')),
    probabilityOverride: z.coerce.number().int().min(0).max(100).optional(),
    source: z.enum(sourceValues as [string, ...string[]]).optional(),
    campaign: z.string().trim().max(120).optional().or(z.literal('')),
    priority: z.enum(priorityValues as [string, ...string[]]).optional().default('normal'),
    tagIds: z.array(z.string().uuid()).optional().default([]),
    followerIds: z.array(z.string().uuid()).optional().default([]),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    nextTaskTitle: z.string().trim().max(200).optional().or(z.literal('')),
    nextTaskDueAt: z.string().datetime().optional(),
    nextTaskAssigneeId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const penceFromGbp = parseGbpToPence(data.valueGbp);
    if (data.valueGbp?.trim() && penceFromGbp === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid amount (GBP, up to 2 decimal places).',
        path: ['valueGbp'],
      });
    }

    if (data.expectedCloseDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const close = new Date(`${data.expectedCloseDate}T00:00:00`);
      if (close < today) {
        ctx.addIssue({
          code: 'custom',
          message: 'Expected close date cannot be in the past.',
          path: ['expectedCloseDate'],
        });
      }
    }
  })
  .transform((data) => {
    const fromGbp = parseGbpToPence(data.valueGbp);
    const valuePence =
      fromGbp !== undefined ? fromGbp : data.valuePence !== undefined ? data.valuePence : undefined;
    return {
      ...data,
      valuePence,
      expectedCloseDate: data.expectedCloseDate?.trim() || undefined,
      campaign: data.campaign?.trim() || undefined,
      description: data.description?.trim() || undefined,
      nextTaskTitle: data.nextTaskTitle?.trim() || undefined,
    };
  });

export const moveOpportunitySchema = z.object({
  opportunityId: z.string().uuid(),
  stageId: z.string().uuid(),
  position: z.string().min(1).max(64),
  version: z.number().int().min(1),
  lostReasonId: z.string().uuid().optional(),
  lostNote: z.string().trim().max(2000).optional(),
});

export const updateOpportunitySchema = z
  .object({
    opportunityId: z.string().uuid(),
    version: z.number().int().min(1),
    name: z.string().trim().min(1).max(200).optional(),
    valuePence: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
    expectedCloseDate: z
      .union([
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        z.null(),
      ])
      .optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.valuePence !== undefined ||
      value.expectedCloseDate !== undefined,
    { message: 'Nothing to update.' },
  );

export type CreateOpportunityInput = z.input<typeof createOpportunitySchema>;
export type CreateOpportunityPayload = z.output<typeof createOpportunitySchema>;
export type MoveOpportunityInput = z.infer<typeof moveOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
