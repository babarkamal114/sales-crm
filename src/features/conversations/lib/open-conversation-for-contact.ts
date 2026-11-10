import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { MessageChannel } from '@/domain/conversations/types';

export async function openConversationForContact(
  router: AppRouterInstance,
  contactId: string,
  channel?: MessageChannel,
): Promise<boolean> {
  const params = new URLSearchParams();
  if (channel) params.set('channel', channel);
  const response = await fetch(
    `/api/v1/conversations/by-contact/${contactId}?${params.toString()}`,
  );
  if (!response.ok) return false;
  const data = (await response.json()) as { href: string };
  router.push(data.href);
  return true;
}
