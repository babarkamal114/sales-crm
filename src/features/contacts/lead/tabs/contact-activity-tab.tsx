'use client';

import { useQuery } from '@tanstack/react-query';
import type { ContactActivityFeed } from '@/domain/contacts/profile-view';
import { formatDateTime } from '@/features/opportunities/lib/format-duration';

async function fetchActivity(contactId: string) {
  const response = await fetch(`/api/v1/contacts/${contactId}/activity`);
  if (!response.ok) throw new Error('Failed');
  return response.json() as Promise<ContactActivityFeed>;
}

export function ContactActivityTab({ contactId }: { contactId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['contact-activity', contactId],
    queryFn: () => fetchActivity(contactId),
  });

  if (isLoading) {
    return <p className="text-[13px] text-ink-500">Loading activity…</p>;
  }
  if (isError || !data) {
    return <p className="text-[13px] text-rose-700">Could not load activity.</p>;
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-[15px] font-extrabold text-ink-900">Activity</h2>
        <ul className="mt-3 divide-y divide-line/70">
          {data.items.length === 0 ? (
            <li className="py-4 text-[13px] text-ink-500">No activity yet</li>
          ) : (
            data.items.map((item) => (
              <li key={item.id} className="py-3 text-[13px] font-medium text-ink-800">
                {item.label}
                <time className="ml-2 text-[12px] font-normal text-ink-400">
                  {formatDateTime(item.at)}
                </time>
              </li>
            ))
          )}
        </ul>
      </section>

      {data.attribution.length > 0 ? (
        <section className="rounded-2xl border border-line/70 bg-soft/40 p-4">
          <h3 className="text-[13px] font-bold text-ink-900">Attribution</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(['first', 'latest'] as const).map((touch) => {
              const row = data.attribution.find((a) => a.touch === touch);
              if (!row) return null;
              return (
                <div key={touch} className="rounded-xl bg-white p-3 text-[12px]">
                  <b className="block text-[11px] font-bold uppercase text-ink-400">
                    {touch === 'first' ? 'First touch' : 'Latest touch'}
                  </b>
                  <p className="mt-1 font-semibold text-ink-900">
                    {[row.source, row.medium].filter(Boolean).join(' · ') || 'Unknown'}
                  </p>
                  {row.campaign ? (
                    <p className="text-ink-500">Campaign: {row.campaign}</p>
                  ) : null}
                  <time className="text-ink-400">{formatDateTime(row.capturedAt)}</time>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
