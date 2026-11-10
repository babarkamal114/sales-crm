import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  clientId: z.string().uuid(),
  channel: z.enum(['email', 'sms', 'whatsapp']),
  purpose: z.enum(['conversation', 'marketing']).default('conversation'),
  subject: z.string().max(998).optional(),
  bodyText: z.string().min(1).max(100_000),
  bodyHtml: z.string().max(500_000).optional(),
  templateId: z.string().uuid().optional(),
  scheduledAt: z.coerce.date().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const addConversationCommentSchema = z.object({
  conversationId: z.string().uuid(),
  clientId: z.string().uuid(),
  body: z.string().min(1).max(20_000),
});

export type AddConversationCommentInput = z.infer<typeof addConversationCommentSchema>;
