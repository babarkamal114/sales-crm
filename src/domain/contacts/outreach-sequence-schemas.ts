import { z } from 'zod';

export const outreachSequenceStepSchema = z.object({
  stepKey: z.string().min(1).max(120),
  label: z.string().min(1).max(200),
  daysAfterPrevious: z.number().int().min(0).max(365),
  reminderTitle: z.string().min(1).max(200),
});

export const orgOutreachSequenceStepsSchema = z
  .array(outreachSequenceStepSchema)
  .min(1)
  .max(20);

export const upsertOrgOutreachSequenceSchema = z.object({
  sequenceKey: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  steps: orgOutreachSequenceStepsSchema,
});

export const createOrgOutreachSequenceSchema = z.object({
  label: z.string().trim().min(1).max(120),
});

export const deleteOrgOutreachSequenceSchema = z.object({
  sequenceKey: z.string().min(1).max(80),
});

export type OrgOutreachSequenceSteps = z.infer<typeof orgOutreachSequenceStepsSchema>;
