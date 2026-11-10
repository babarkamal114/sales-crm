import type { Metadata } from 'next';
import { ConversationsPageClient } from '@/features/conversations/conversations-page-client';
import { requireSession } from '@/server/auth/require-session';

export const metadata: Metadata = { title: 'Conversations' };

export default async function ConversationsPage() {
  const session = await requireSession();
  return <ConversationsPageClient userId={session.userId} />;
}
