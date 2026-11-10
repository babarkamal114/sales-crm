import { z } from 'zod';

const uuid = z.string().uuid();

export const createContactNoteSchema = z.object({
  contactId: uuid,
  body: z.string().trim().min(1).max(10_000),
});

export const createContactTaskSchema = z.object({
  contactId: uuid,
  title: z.string().trim().min(1).max(200),
  assigneeId: uuid.optional(),
  dueAt: z.string().datetime().optional(),
  kind: z
    .enum(['follow_up', 'member_request', 'email_reminder'])
    .optional()
    .default('follow_up'),
});

export const setContactTaskCompletedSchema = z.object({
  taskId: uuid,
  completed: z.boolean(),
});

export type CreateContactNoteInput = z.infer<typeof createContactNoteSchema>;
export type CreateContactTaskInput = z.infer<typeof createContactTaskSchema>;
export type SetContactTaskCompletedInput = z.infer<typeof setContactTaskCompletedSchema>;
