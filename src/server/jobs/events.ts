import { z } from 'zod';

export const messageSendEventSchema = z.object({
  orgId: z.string().uuid(),
  messageId: z.string().uuid(),
  requestId: z.string().uuid(),
});

export type MessageSendEvent = z.infer<typeof messageSendEventSchema>;
