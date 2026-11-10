import type { MessageTimelineItem } from '@/domain/conversations/types';

function isMeaningful(item: MessageTimelineItem): boolean {
  if (item.isAutoReply) return false;
  if (item.channel === 'comment' || item.channel === 'event') return false;
  return item.channel === 'email' || item.channel === 'sms' || item.channel === 'whatsapp' || item.channel === 'call';
}

/** First inbound after the last outbound; null if the last message is outbound. */
export function waitingSince(messages: MessageTimelineItem[]): Date | null {
  const sorted = [...messages]
    .filter(isMeaningful)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (sorted.length === 0) return null;

  const last = sorted[sorted.length - 1]!;
  if (last.direction === 'outbound') return null;

  let lastOutboundAt = -1;
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i]!.direction === 'outbound') lastOutboundAt = i;
  }

  for (let i = lastOutboundAt + 1; i < sorted.length; i += 1) {
    const item = sorted[i]!;
    if (item.direction === 'inbound') return item.createdAt;
  }

  if (lastOutboundAt === -1 && last.direction === 'inbound') {
    return last.createdAt;
  }

  return null;
}
