'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import { ContactTeamPanel } from '@/features/contacts/components/contact-team-panel';
import { ContactTasksPanel } from '@/features/contacts/components/contact-tasks-panel';
import { useContactLeadSession } from '@/features/contacts/lead/contact-lead-profile-context';
import { StatusPill } from '@/components/ui/status-pill';

export function ContactAssociationsTab() {
  const { profile, userId, role } = useContactLeadSession();
  const router = useRouter();
  const [requestAssignee, setRequestAssignee] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <ContactTeamPanel
        profile={profile}
        role={role}
        currentUserId={userId}
        onUpdated={() => router.refresh()}
        onRequestMember={(memberId) => setRequestAssignee(memberId)}
      />
      {requestAssignee ? (
        <ContactTasksPanel
          contactId={profile.id}
          currentUserId={userId}
          restricted={profile.restricted}
          defaultKind="member_request"
          defaultAssigneeId={requestAssignee}
          onChanged={() => {
            setRequestAssignee(null);
            router.refresh();
          }}
        />
      ) : null}

    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="text-[15px] font-extrabold text-ink-900">Companies</h2>
        <ul className="mt-3 divide-y divide-line/70">
          {profile.companyId && profile.companyName ? (
            <li className="py-3">
              <Link
                href={`/companies/${profile.companyId}`}
                className="text-[14px] font-bold text-brand-600"
              >
                {profile.companyName}
              </Link>
              <p className="text-[12px] text-ink-500">Primary company</p>
            </li>
          ) : (
            <li className="py-3 text-[13px] text-ink-500">No companies linked</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-[15px] font-extrabold text-ink-900">Opportunities</h2>
        <ul className="mt-3 divide-y divide-line/70">
          {profile.opportunities.length === 0 ? (
            <li className="py-3 text-[13px] text-ink-500">No deals</li>
          ) : (
            profile.opportunities.map((deal) => (
              <li key={deal.id} className="flex items-center gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/opportunities?deal=${deal.id}`}
                    className="text-[14px] font-bold text-ink-900 hover:text-brand-600"
                  >
                    {deal.name}
                  </Link>
                  <p className="text-[12px] text-ink-500">
                    {deal.pipelineName} · {deal.stageName}
                  </p>
                </div>
                <StatusPill
                  status={deal.status === 'won' ? 'Won' : deal.status === 'lost' ? 'Lost' : 'Open'}
                  showDot={false}
                />
                {deal.status !== 'lost' ? (
                  <span className="num text-[13px] font-bold">
                    {formatOpportunityValue(deal.valuePence, 'GBP')}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
    </div>
  );
}
