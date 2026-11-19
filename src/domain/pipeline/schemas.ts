import { z } from 'zod';
import { PIPELINE_COLOR_PATTERN } from '@/domain/pipeline/colors';

export const managePipelineMembersSchema = z.object({
  pipelineId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()),
});

export type ManagePipelineMembersInput = z.infer<typeof managePipelineMembersSchema>;

export const pipelineIdSchema = z.object({
  pipelineId: z.string().uuid(),
});

export type PipelineIdInput = z.infer<typeof pipelineIdSchema>;

export const pipelineColorSchema = z
  .string()
  .regex(PIPELINE_COLOR_PATTERN, 'Use a hex colour such as #3B82F6.');

const editableStageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'Enter a stage name.').max(120),
  kind: z.enum(['open', 'won', 'lost']),
  position: z.number().int().nonnegative(),
  probability: z.number().int().min(0).max(100).nullable(),
  rottingDays: z.number().int().positive().max(3650).nullable(),
  version: z.number().int().positive(),
});

export const updatePipelineSettingsSchema = z.object({
  pipelineId: z.string().uuid(),
  version: z.number().int().positive(),
  name: z.string().trim().min(1, 'Enter a pipeline name.').max(120),
  slug: z
    .string()
    .trim()
    .min(1, 'Enter a pipeline slug.')
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.'),
  color: pipelineColorSchema,
  isDefault: z.boolean(),
  ownerId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()),
  stages: z.array(editableStageSchema).min(1, 'A pipeline needs at least one stage.'),
});

export type UpdatePipelineSettingsInput = z.infer<typeof updatePipelineSettingsSchema>;
