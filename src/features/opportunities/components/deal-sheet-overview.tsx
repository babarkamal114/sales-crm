'use client';

import type { ReactNode } from 'react';
import type { OpportunityDetailView } from '@/domain/opportunities/detail-view';
import {
  formatExactValueTooltip,
  formatOpportunityValue,
} from '@/features/opportunities/lib/format-money';
import { formatShortDate } from '@/features/opportunities/lib/format-duration';
import { EntityLink } from '@/components/entities/entity-link';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-line/60 py-3 last:border-0">
      <dt className="text-[12px] font-semibold text-ink-500">{label}</dt>
      <dd className="text-[13px] font-bold text-ink-900">{children}</dd>
    </div>
  );
}

export function DealSheetOverview({
  deal,
  editing,
  fields,
  pending,
}: {
  deal: OpportunityDetailView;
  editing: boolean;
  pending: boolean;
  fields: {
    name: string;
    setName: (value: string) => void;
    valuePounds: string;
    setValuePounds: (value: string) => void;
    closeDate: string;
    setCloseDate: (value: string) => void;
  };
}) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Deal</h3>
        <dl className="mt-2 rounded-2xl border border-line/70 bg-soft/40 px-4">
          {editing ? (
            <>
              <DetailRow label="Name">
                <input
                  className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[13px] font-medium"
                  value={fields.name}
                  disabled={pending}
                  onChange={(event) => fields.setName(event.target.value)}
                />
              </DetailRow>
              <DetailRow label="Value (£)">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[13px] font-medium num"
                  value={fields.valuePounds}
                  disabled={pending}
                  onChange={(event) => fields.setValuePounds(event.target.value)}
                />
              </DetailRow>
              <DetailRow label="Close date">
                <input
                  type="date"
                  className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[13px] font-medium"
                  value={fields.closeDate}
                  disabled={pending}
                  onChange={(event) => fields.setCloseDate(event.target.value)}
                />
              </DetailRow>
            </>
          ) : (
            <>
              <DetailRow label="Name">{deal.name}</DetailRow>
              <DetailRow label="Stage">
                <span className="inline-flex items-center gap-2">
                  {deal.stage.name}
                  {deal.status === 'won' ? <StatusPill status="Won" /> : null}
                  {deal.status === 'lost' ? <StatusPill status="Lost" /> : null}
                </span>
              </DetailRow>
              <DetailRow label="Value">
                <span title={formatExactValueTooltip(deal.valuePence, deal.currency)}>
                  {formatOpportunityValue(deal.valuePence, deal.currency)}
                </span>
              </DetailRow>
            </>
          )}
          <DetailRow label="Weighted">
            {formatOpportunityValue(deal.weightedValuePence, deal.currency)}
            <span className="ml-1 text-[12px] font-semibold text-ink-500">
              ({deal.probabilityPercent}%)
            </span>
          </DetailRow>
          <DetailRow label="Pipeline">{deal.pipelineName}</DetailRow>
          {!editing && deal.expectedCloseDate ? (
            <DetailRow label="Close date">{formatShortDate(deal.expectedCloseDate)}</DetailRow>
          ) : null}
          {deal.source ? <DetailRow label="Source">{deal.source}</DetailRow> : null}
          {deal.campaign ? <DetailRow label="Campaign">{deal.campaign}</DetailRow> : null}
          {deal.status === 'lost' && deal.lostReasonName ? (
            <DetailRow label="Lost reason">{deal.lostReasonName}</DetailRow>
          ) : null}
          {deal.status === 'lost' && deal.lostNote ? (
            <DetailRow label="Lost note">
              <span className="font-medium text-ink-700">{deal.lostNote}</span>
            </DetailRow>
          ) : null}
        </dl>
      </section>

      <section>
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Contact</h3>
        <dl className="mt-2 rounded-2xl border border-line/70 bg-soft/40 px-4">
          <DetailRow label="Name">
            <EntityLink entity={{ type: 'contact', id: deal.contact.id }}>
              {deal.contact.displayName}
            </EntityLink>
          </DetailRow>
          {deal.contact.email ? <DetailRow label="Email">{deal.contact.email}</DetailRow> : null}
          {deal.contact.phoneE164 ? (
            <DetailRow label="Phone">{deal.contact.phoneE164}</DetailRow>
          ) : null}
        </dl>
      </section>

      <section>
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Timing</h3>
        <dl className="mt-2 rounded-2xl border border-line/70 bg-soft/40 px-4">
          <DetailRow label="In stage">
            <span className={cn(deal.isRotting && 'text-amber-700')}>
              {`${deal.daysInStage} days${deal.isRotting ? ' · needs attention' : ''}`}
            </span>
          </DetailRow>
          <DetailRow label="Owner">
            <span className="inline-flex items-center gap-2">
              <span
                className="flex size-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: deal.owner.colour }}
              >
                {deal.owner.initials}
              </span>
              {deal.owner.fullName}
            </span>
          </DetailRow>
          <DetailRow label="Created">{formatShortDate(deal.createdAt)}</DetailRow>
        </dl>
      </section>
    </div>
  );
}
