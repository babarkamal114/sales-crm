'use client';

import { useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ContentPanel } from '@/components/layouts/app-header';
import { ConversationsInbox } from '@/features/conversations/components/conversations-inbox';
import { ConversationsInboxSkeleton } from '@/features/conversations/components/conversations-inbox-skeleton';
import type { InboxScenario } from '@/features/conversations/types/inbox-view';
import { qk } from '@/lib/query-keys';

async function fetchBootstrap(conversationId: string | null): Promise<InboxScenario> {
  const params = new URLSearchParams();
  if (conversationId) params.set('c', conversationId);
  const response = await fetch(`/api/v1/conversations/bootstrap?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to load conversations');
  return response.json() as Promise<InboxScenario>;
}

export function ConversationsPageClient({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('c');
  const composerChannel = searchParams.get('channel');

  const bootstrapQuery = useQuery({
    queryKey: qk.conversations.bootstrap(selectedId),
    queryFn: () => fetchBootstrap(selectedId),
    staleTime: 15_000,
  });

  const scenario = bootstrapQuery.data;

  useEffect(() => {
    if (selectedId || bootstrapQuery.isLoading || !bootstrapQuery.data) return;
    const first = bootstrapQuery.data.conversations[0];
    if (!first) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('scenario');
    params.delete('live');
    params.delete('demo');
    params.set('c', first.id);
    router.replace(`/conversations?${params.toString()}`, { scroll: false });
  }, [selectedId, bootstrapQuery.isLoading, bootstrapQuery.data, router, searchParams]);

  const onSelect = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('scenario');
      params.delete('live');
      params.delete('demo');
      if (id) params.set('c', id);
      else params.delete('c');
      router.replace(`/conversations?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const unread = scenario?.conversations.filter((c) => c.unread && c.status === 'open').length ?? 0;
  const waitingOnYou =
    scenario?.conversations.filter(
      (c) => c.status === 'open' && c.waitingMinutes > 0 && c.assigneeId === userId,
    ).length ?? 0;

  return (
    <ContentPanel className="flex min-h-[calc(100dvh-10rem)] flex-col pb-5">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl2 border border-line/70 bg-panel shadow-panel backdrop-blur-xl">
        <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line/80 px-4 py-3.5 sm:px-5">
          <h1 className="text-[20px] font-extrabold tracking-tight text-ink-900">Conversations</h1>
          <p className="text-[13px] text-ink-500">
            <span className="num font-semibold text-ink-800">{unread}</span> unread
            <span className="mx-2 text-ink-300" aria-hidden>
              ·
            </span>
            <span className="num font-semibold text-brand-700">{waitingOnYou}</span> waiting on you
          </p>
        </header>
        {bootstrapQuery.isLoading ? (
          <ConversationsInboxSkeleton />
        ) : bootstrapQuery.isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="text-[15px] font-semibold text-ink-900">Could not load conversations</p>
            <p className="max-w-sm text-[13px] text-ink-500">
              If this is a fresh environment, seed a sample thread with{' '}
              <code className="rounded bg-soft px-1.5 py-0.5 text-[12px]">pnpm db:seed-conversations-demo</code>
              .
            </p>
          </div>
        ) : scenario && scenario.conversations.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="text-[15px] font-semibold text-ink-900">No conversations yet</p>
            <p className="max-w-sm text-[13px] text-ink-500">
              When someone emails or messages a contact, it will appear here. Inbound messages create
              conversations automatically.
            </p>
          </div>
        ) : scenario ? (
          <ConversationsInbox
            scenario={scenario}
            selectedId={selectedId}
            onSelect={onSelect}
            userId={userId}
            initialComposerChannel={composerChannel}
            onSent={() => void bootstrapQuery.refetch()}
          />
        ) : null}
      </section>
    </ContentPanel>
  );
}
