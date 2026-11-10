'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  ExternalLink,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { CompanyDetail } from '@/domain/companies/detail-view';
import { useCreateDialog } from '@/components/create-dialog';
import { ContentPanel } from '@/components/layouts/app-header';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { AddContactDialog } from '@/features/contacts/components/add-contact-dialog';
import { CompanyContactMenu } from '@/features/companies/components/company-contact-menu';
import { CompanyDetailsReadonly } from '@/features/companies/components/company-details-readonly';
import { CompanyLogoMark } from '@/features/companies/components/company-logo-mark';
import { CompanyPeopleRowActions } from '@/features/companies/components/company-people-row-actions';
import { EditCompanyDialog } from '@/features/companies/components/edit-company-dialog';
import { LinkContactDialog } from '@/features/companies/components/link-contact-dialog';
import { MergeCompaniesDialog } from '@/features/companies/components/merge-companies-dialog';
import { formatDateTime } from '@/features/opportunities/lib/format-duration';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import { qk } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { deleteCompanyAction } from '@/server/actions/companies/company-lifecycle';

const LIFECYCLE_LABEL: Record<string, string> = {
  customer: 'Customer',
  prospect: 'Prospect',
  former_customer: 'Former customer',
  not_a_fit: 'Not a fit',
};

async function fetchCompany(companyId: string) {
  const response = await fetch(`/api/v1/companies/${companyId}`);
  if (response.status === 404) throw new Error('NOT_FOUND');
  if (!response.ok) throw new Error('Failed');
  return response.json() as Promise<CompanyDetail>;
}

export function CompanyDetailClient({
  companyId,
  initial,
  role,
  userId,
}: {
  companyId: string;
  initial: CompanyDetail;
  role: string;
  userId: string;
}) {
  const router = useRouter();
  const { openCreate } = useCreateDialog();
  const [linkOpen, setLinkOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const canManage = role === 'admin' || role === 'manager';
  const canEdit = true;

  const { data: company = initial, refetch, isError } = useQuery({
    queryKey: qk.companies.detail(companyId),
    queryFn: () => fetchCompany(companyId),
    initialData: initial,
  });

  const locationLine = useMemo(
    () => [company.industry, company.city].filter(Boolean).join(' · '),
    [company.industry, company.city],
  );

  const refresh = () => void refetch();

  const deleteCompany = () => {
    if (
      !window.confirm(
        'Delete this company? Contacts are kept; deals lose the company link.',
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCompanyAction({
        companyId: company.id,
        version: company.version,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Company deleted');
      router.push('/companies');
    });
  };

  const openDeal = () => {
    const primary = company.contacts.find((p) => p.isPrimary) ?? company.contacts[0];
    openCreate('opportunity', {
      companyId: company.id,
      ...(primary ? { contactId: primary.id } : {}),
    });
  };

  if (isError) {
    return (
      <ContentPanel className="py-16 text-center">
        <p className="text-[14px] font-bold text-rose-800">Company not found</p>
        <Button type="button" variant="secondary" className="mt-4" asChild>
          <Link href="/companies">Back to companies</Link>
        </Button>
      </ContentPanel>
    );
  }

  return (
    <ContentPanel className="space-y-5 pb-28">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/companies"
          className="text-[13px] font-semibold text-ink-500 hover:text-brand-600"
        >
          ← Companies
        </Link>
        {canManage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-rose-700"
            disabled={pending}
            onClick={deleteCompany}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        ) : null}
      </div>

      <header className="rounded-xl2 border border-line/70 bg-panel p-5 shadow-panel backdrop-blur-xl">
        <div className="flex flex-wrap gap-4">
          <CompanyLogoMark name={company.displayName} domain={company.domain} className="size-14 text-lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-extrabold text-ink-900">{company.displayName}</h1>
            {company.domain ? (
              <a
                href={`https://${company.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline"
              >
                {company.domain}
                <ExternalLink className="size-3.5" />
              </a>
            ) : null}
            {locationLine ? (
              <p className="mt-1 text-[13px] text-ink-500">{locationLine}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill status={LIFECYCLE_LABEL[company.lifecycle] ?? company.lifecycle} />
              {company.lifecycleSource === 'derived' ? (
                <span className="text-[11px] font-medium text-ink-400">Auto lifecycle</span>
              ) : null}
              <span className="text-[12px] text-ink-500">Owner · {company.owner.fullName}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            label="Open pipeline"
            value={formatOpportunityValue(company.openPipelineValuePence, 'GBP')}
          />
          <StatTile
            label="Won to date"
            value={formatOpportunityValue(company.wonValueTotalPence, 'GBP')}
          />
          <StatTile label="Contacts" value={String(company.contactCount)} />
          <StatTile
            label="Last activity"
            value={company.lastActivityAt ? formatDateTime(company.lastActivityAt) : '—'}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <CompanyContactMenu
            onAddNew={() => setAddContactOpen(true)}
            onLinkExisting={() => setLinkOpen(true)}
          />
          <Button type="button" variant="secondary" size="sm" onClick={openDeal}>
            <Building2 className="size-4" />
            Deal
          </Button>
        </div>
      </header>

      {company.duplicate ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[13px] text-amber-950">
          <strong>Possible duplicate:</strong> {company.duplicate.name}
          {company.duplicate.domain ? ` (${company.duplicate.domain})` : ''}.{' '}
          <Link href={`/companies/${company.duplicate.id}`} className="font-semibold text-brand-700 underline">
            Open record
          </Link>
          {canManage ? (
            <>
              {' · '}
              <button
                type="button"
                className="font-semibold text-brand-700 underline"
                onClick={() => setMergeOpen(true)}
              >
                Merge…
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-xl2 border border-line/70 bg-panel p-5 shadow-panel">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-extrabold text-ink-900">Company details</h2>
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto gap-1.5 text-brand-700"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ) : null}
        </div>
        <CompanyDetailsReadonly company={company} />
      </section>

      <section className="rounded-xl2 border border-line/70 bg-panel p-5 shadow-panel">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-[16px] font-extrabold text-ink-900">People</h2>
          <div className="ml-auto">
            <CompanyContactMenu
              onAddNew={() => setAddContactOpen(true)}
              onLinkExisting={() => setLinkOpen(true)}
            />
          </div>
        </div>
        {company.contacts.length === 0 ? (
          <p className="text-[13px] text-ink-500">No linked contacts yet.</p>
        ) : (
          <ul className="space-y-2">
            {company.contacts.map((person) => (
              <li key={person.id}>
                <div className="flex items-center gap-2 rounded-xl border border-line/70 px-2 py-1 hover:bg-soft/50">
                  <Link
                    href={`/contacts/${person.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 py-1.5"
                  >
                    <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-[12px] font-bold text-brand-700">
                      {person.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-brand-600">
                        {person.displayName}
                        {person.isPrimary ? (
                          <span className="ml-2 text-[11px] font-semibold text-brand-600">
                            Primary
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[12px] text-ink-500">
                        {[person.role, person.email].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </span>
                    <span className="flex gap-1">
                      <ChannelIcon ok={person.canContactEmail} icon={Mail} />
                      <ChannelIcon ok={person.canContactSms} icon={MessageSquare} />
                      <ChannelIcon ok={person.canContactCall} icon={Phone} />
                    </span>
                  </Link>
                  <CompanyPeopleRowActions
                    companyId={company.id}
                    person={{
                      id: person.id,
                      version: person.version,
                      displayName: person.displayName,
                      isPrimary: person.isPrimary,
                      role: person.role,
                    }}
                    onChanged={refresh}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl2 border border-line/70 bg-panel p-5 shadow-panel">
        <h2 className="mb-3 text-[16px] font-extrabold text-ink-900">Opportunities</h2>
        {company.opportunities.length === 0 ? (
          <p className="text-[13px] text-ink-500">No deals linked to this company yet.</p>
        ) : (
          <ul className="divide-y divide-line/70">
            {company.opportunities.map((deal) => (
              <li key={deal.id} className="flex flex-wrap items-center gap-2 py-3">
                <button
                  type="button"
                  className="text-left text-[14px] font-bold text-ink-900 hover:text-brand-600"
                  onClick={() => router.push(`/opportunities?deal=${deal.id}`)}
                >
                  {deal.name}
                </button>
                <span className="text-[12px] text-ink-500">
                  {deal.stageName}
                  {deal.contactName ? ` · ${deal.contactName}` : ''}
                </span>
                <StatusPill
                  status={
                    deal.status === 'won' ? 'Won' : deal.status === 'lost' ? 'Lost' : 'Open'
                  }
                  showDot={false}
                />
                <span className="ml-auto num text-[13px] font-bold">
                  {deal.status === 'lost' || deal.valuePence == null
                    ? '—'
                    : formatOpportunityValue(deal.valuePence, 'GBP')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl2 border border-line/70 bg-panel p-5 shadow-panel">
        <h2 className="text-[16px] font-extrabold text-ink-900">Recent activity</h2>
        {company.recentActivity.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-500">
            Activity appears here when your team updates this company.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {company.recentActivity.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/50 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-[13px] font-medium text-ink-800">{item.label}</span>
                <time className="text-[12px] text-ink-400">{formatDateTime(item.at)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LinkContactDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        companyId={company.id}
        onLinked={refresh}
      />
      <AddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        role={role}
        userId={userId}
        defaultCompanyId={company.id}
        defaultCompanyName={company.name}
        onCreated={() => {
          setAddContactOpen(false);
          refresh();
        }}
      />
      <EditCompanyDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        company={company}
        canPickOwner={canManage}
        onSaved={refresh}
      />

      {company.duplicate && canManage ? (
        <MergeCompaniesDialog
          open={mergeOpen}
          onOpenChange={setMergeOpen}
          companies={[
            { id: company.id, name: company.name, domain: company.domain },
            {
              id: company.duplicate.id,
              name: company.duplicate.name,
              domain: company.duplicate.domain,
            },
          ]}
          onMerged={(survivingId) => {
            setMergeOpen(false);
            if (survivingId !== company.id) {
              router.push(`/companies/${survivingId}`);
            } else {
              refresh();
            }
          }}
        />
      ) : null}
    </ContentPanel>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/70 bg-soft/40 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="num mt-0.5 text-[15px] font-extrabold text-ink-900">{value}</p>
    </div>
  );
}

function ChannelIcon({
  ok,
  icon: Icon,
}: {
  ok: boolean;
  icon: typeof Mail;
}) {
  return (
    <span
      className={cn(
        'grid size-6 place-items-center rounded-md',
        ok ? 'bg-soft text-ink-600' : 'bg-rose-50 text-rose-700',
      )}
    >
      <Icon className="size-3.5" />
    </span>
  );
}
