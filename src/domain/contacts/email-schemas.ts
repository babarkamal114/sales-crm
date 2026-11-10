import { z } from 'zod';
import { normaliseCustomStepKey } from '@/domain/contacts/email-template-steps';

const uuid = z.string().uuid();

export const upsertContactEmailTemplateSchema = z.object({
  templateId: uuid.optional(),
  stepKey: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .transform(normaliseCustomStepKey)
    .refine((k) => k.length >= 2, 'Step key is required'),
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(500),
  bodyHtml: z.string().trim().min(1).max(100_000),
});

export const deleteContactEmailTemplateSchema = z.object({
  templateId: uuid,
});

export const sendContactEmailSchema = z.object({
  contactIds: z.array(uuid).min(1).max(50),
  subject: z.string().trim().min(1).max(500),
  bodyHtml: z.string().trim().min(1).max(100_000),
  templateId: uuid.optional(),
  stepKey: z.string().trim().max(48).optional(),
  saveTemplate: upsertContactEmailTemplateSchema.optional(),
  advanceSequence: z.boolean().optional().default(true),
  scheduleNextReminder: z.boolean().optional().default(true),
  replyDraftId: uuid.optional(),
});

export type SendContactEmailInput = z.infer<typeof sendContactEmailSchema>;
export type UpsertContactEmailTemplateInput = z.infer<typeof upsertContactEmailTemplateSchema>;
