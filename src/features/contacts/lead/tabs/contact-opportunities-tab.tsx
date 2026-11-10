'use client';

import Link from 'next/link';
import type { ContactProfile } from '@/domain/contacts/profile-view';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import { useCreateDialog } from '@/components/create-dialog';
import { opportunityPrefillFromContact } from '@/lib/entities/opportunity-prefill';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';

export function ContactOpportunitiesTab({ profile }: { profile: ContactProfile }) {
  const { openCreate } = useCreateDialog();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-extrabold text-ink-900">Opportunities</h2>
        <Button
          type="button"
          size="sm"
          className="ml-auto"
          disabled={profile.restricted}
          onClick={() =>
            openCreate('opportunity', opportunityPrefillFromContact(profile))
          }
        >
          Add deal
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line/70">
        <table className="min-w-full text-left text-[13px]">
          <thead className="bg-soft/80 text-[12px] font-semibold text-ink-500">
            <tr>
              <th className="px-3 py-2">Deal</th>
              <th className="px-3 py-2">Pipeline</th>
              <th className="px-3 py-2">Stage</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {profile.opportunities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-ink-500">
                  No opportunities yet
                </td>
              </tr>
            ) : (
              profile.opportunities.map((deal) => (
                <tr key={deal.id} className="border-t border-line/60">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/opportunities?deal=${deal.id}`}
                      className="font-bold text-brand-600"
                    >
                      {deal.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-ink-700">{deal.pipelineName}</td>
                  <td className="px-3 py-2.5 text-ink-700">{deal.stageName}</td>
                  <td className="px-3 py-2.5">
                    <StatusPill
                      status={
                        deal.status === 'won' ? 'Won' : deal.status === 'lost' ? 'Lost' : 'Open'
                      }
                      showDot={false}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold">
                    {deal.status === 'lost'
                      ? '—'
                      : formatOpportunityValue(deal.valuePence, 'GBP')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
