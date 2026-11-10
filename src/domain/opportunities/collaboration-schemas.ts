import { z } from 'zod';

export const createOpportunityNoteSchema = z.object({
  opportunityId: z.string().uuid(),
  body: z.string().trim().min(1, 'Write something').max(10_000),
});

export type CreateOpportunityNoteInput = z.infer<typeof createOpportunityNoteSchema>;

export const createOpportunityTaskSchema = z.object({
  opportunityId: z.string().uuid(),
  title: z.string().trim().min(1, 'Add a title').max(200),
  assigneeId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
});

export type CreateOpportunityTaskInput = z.infer<typeof createOpportunityTaskSchema>;

export const setOpportunityTaskCompletedSchema = z.object({
  taskId: z.string().uuid(),
  completed: z.boolean(),
});

export type SetOpportunityTaskCompletedInput = z.infer<
  typeof setOpportunityTaskCompletedSchema
>;
