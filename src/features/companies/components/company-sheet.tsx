'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AddContactDialog } from '@/features/contacts/components/add-contact-dialog';
import { CompanyContactMenu } from '@/features/companies/components/company-contact-menu';
import { CompanyPeopleRowActions } from '@/features/companies/components/company-people-row-actions';
import { LinkContactDialog } from '@/features/companies/components/link-contact-dialog';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CompanyQuickView } from '@/domain/companies/quick-view';
import { formatDateTime } from '@/features/opportunities/lib/format-duration';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import { CompanyLogoMark } from '@/features/companies/components/company-logo-mark';
import {
  Sheet,
  SheetBody,
  SheetCloseButton,
  SheetContent,
  SheetHeader,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { useCreateDialog } from '@/components/create-dialog';
import { qk } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const LIFECYCLE_LABEL: Record<string, { label: string; tone: 'mint' | 'brand' | 'amber' | 'neutral' }> = {
  customer: { label: 'Customer', tone: 'mint' },
  prospect: { label: 'Prospect', tone: 'brand' },
  former_customer: { label: 'Former customer', tone: 'amber' },
  not_a_fit: { label: 'Not a fit', tone: 'neutral' },
};

async function fetchCompanyQuick(companyId: string) {
  const response = await fetch(`/api/v1/companies/${companyId}/quick`);
  if (response.status === 404) throw new Error('NOT_FOUND');
  if (!response.ok) throw new Error('Failed');
  return response.json() as Promise<{ company: CompanyQuickView }>;
}

function copyText(label: string, value: string) {
  void navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

export function CompanySheet({
  companyIds,
  onNavigate,
  role,
  userId,
}: {
  companyIds: string[];
  onNavigate?: (companyId: string) => void;
  role: string;
  userId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { openCreate } = useCreateDialog();
  const companyId = searchParams.get('company');
  const open = Boolean(companyId);

  const index = companyId ? companyIds.indexOf(companyId) : -1;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: qk.companies.quick(companyId!),
    queryFn: () => fetchCompanyQuick(companyId!),
    enabled: Boolean(companyId),
  });

  const company = data?.company;
  const [linkOpen, setLinkOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);

  const refreshCompany = useCallback(() => {
    if (!companyId) return;
    void queryClient.invalidateQueries({ queryKey: qk.companies.quick(companyId) });
    void queryClient.invalidateQueries({ queryKey: qk.companies.all });
  }, [companyId, queryClient]);

  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('company');
    router.replace(`/companies?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const openCompany = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('company', id);
      router.replace(`/companies?${params.toString()}`, { scroll: false });
      onNavigate?.(id);
    },
    [onNavigate, router, searchParams],
  );

  const step = (delta: number) => {
    if (index < 0 || companyIds.length === 0) return;
    const next = companyIds[index + delta];
    if (next) openCompany(next);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key === 'j' || event.key === 'J') step(1);
      if (event.key === 'k' || event.key === 'K') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, index, open, companyIds]);

  const lifecycle = company ? LIFECYCLE_LABEL[company.lifecycle] : null;

  const locationLine = useMemo(() => {
    if (!company) return null;
    return [company.industry, company.city].filter(Boolean).join(' · ');
  }, [company]);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && close()}>
      <SheetContent className="w-full max-w-[520px] p-0">
        {isLoading && !company ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-brand-600" />
          </div>
        ) : isError || !company ? (
          <div className="p-8 text-center">
            <p className="text-[14px] font-bold text-rose-800">
              {error?.message === 'NOT_FOUND' ? 'Company not found' : 'Could not load company'}
            </p>
            <Button type="button" variant="secondary" className="mt-4" onClick={close}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <SheetHeader className="border-b border-line px-5 pb-4 pt-5">
              <div className="mb-3 flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" disabled={index <= 0} onClick={() => step(-1)}>
                  <ChevronUp className="size-4" />
                  <span className="sr-only">Previous</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index < 0 || index >= companyIds.length - 1}
                  onClick={() => step(1)}
                >
                  <ChevronDown className="size-4" />
                  <span className="sr-only">Next</span>
                </Button>
                <SheetCloseButton className="ml-auto" />
              </div>
              <div className="flex gap-3">
                <CompanyLogoMark name={company.displayName} domain={company.domain} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[18px] font-extrabold text-ink-900">{company.displayName}</h2>
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
                    <p className="mt-1 text-[12px] font-medium text-ink-500">{locationLine}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {lifecycle ? <StatusPill status={lifecycle.label} /> : null}
                    <span className="text-[12px] text-ink-500">
                      Owner · {company.owner.fullName}
                    </span>
                    {company.sizeBand ? (
                      <span className="text-[12px] text-ink-500">{company.sizeBand} employees</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button type="button" variant="secondary" size="sm" asChild>
                  <Link href={`/companies/${company.id}`}>Open company page</Link>
                </Button>
              </div>
            </SheetHeader>

            {company.duplicate ? (
              <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-[13px] text-amber-900">
                <strong>Possible duplicate:</strong> {company.duplicate.name}
                {company.duplicate.domain ? ` (${company.duplicate.domain})` : ''}.{' '}
                <button
                  type="button"
                  className="font-semibold text-brand-700 underline"
                  onClick={() => openCompany(company.duplicate!.id)}
                >
                  Review
                </button>
              </div>
            ) : null}

            <SheetBody className="space-y-6 px-5 py-5">
              <div className="grid grid-cols-2 gap-2">
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

              <div className="flex flex-wrap gap-2">
                <CompanyContactMenu
                  onAddNew={() => setAddContactOpen(true)}
                  onLinkExisting={() => setLinkOpen(true)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const primary =
                      company.contacts.find((p) => p.isPrimary) ?? company.contacts[0];
                    openCreate('opportunity', {
                      companyId: company.id,
                      ...(primary ? { contactId: primary.id } : {}),
                    });
                  }}
                >
                  <Building2 className="size-4" />
                  Deal
                </Button>
                <Button type="button" variant="secondary" size="sm">
                  <CheckSquare className="size-4" />
                  Task
                </Button>
                <Button type="button" variant="secondary" size="sm">
                  <StickyNote className="size-4" />
                  Note
                </Button>
              </div>

              <section>
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-500">People</h3>
                {company.contacts.length === 0 ? (
                  <p className="mt-2 text-[13px] text-ink-500">No linked contacts yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {company.contacts.map((person) => (
                      <li key={person.id}>
                        <div className="flex w-full items-center gap-1 rounded-xl border border-line/70 px-2 py-1 hover:bg-soft/80">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-3 py-1.5 text-left"
                            onClick={() => {
                              const params = new URLSearchParams(searchParams.toString());
                              params.delete('company');
                              params.set('contact', person.id);
                              router.push(`/contacts?${params.toString()}`);
                            }}
                          >
                            <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-[12px] font-bold text-brand-700">
                              {person.initials}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-bold text-ink-900">
                                {person.displayName}
                                {person.isPrimary ? (
                                  <span className="ml-2 text-[11px] font-semibold text-brand-600">
                                    Primary
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-[12px] text-ink-500">
                                {person.role ?? person.email ?? '—'}
                              </span>
                            </span>
                            <span className="flex gap-1">
                              <ChannelIcon ok={person.canContactEmail} icon={Mail} />
                              <ChannelIcon ok={person.canContactSms} icon={MessageSquare} />
                              <ChannelIcon ok={person.canContactCall} icon={Phone} />
                            </span>
                          </button>
                          <CompanyPeopleRowActions
                            companyId={company.id}
                            person={{
                              id: person.id,
                              version: person.version,
                              displayName: person.displayName,
                              isPrimary: person.isPrimary,
                              role: person.role,
                            }}
                            onChanged={refreshCompany}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-500">Opportunities</h3>
                {company.opportunities.length === 0 ? (
                  <p className="mt-2 text-[13px] text-ink-500">No deals yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {company.opportunities.map((deal) => (
                      <li key={deal.id}>
                        <button
                          type="button"
                          className="w-full rounded-xl border border-line/70 px-3 py-2 text-left hover:bg-soft/80"
                          onClick={() => router.push(`/opportunities?deal=${deal.id}`)}
                        >
                          <span className="block text-[14px] font-bold text-ink-900">{deal.name}</span>
                          <span className="text-[12px] text-ink-500">
                            {deal.stageName} ·{' '}
                            {deal.valuePence != null
                              ? formatOpportunityValue(deal.valuePence, 'GBP')
                              : '—'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-500">Company details</h3>
                <dl className="mt-2 space-y-2 text-[13px]">
                  <DetailRow label="Phone" value={company.phoneE164} />
                  <DetailRow label="Companies House" value={company.companiesHouseNumber} />
                </dl>
              </section>

              <section>
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-500">Recent activity</h3>
                {company.recentActivity.length === 0 ? (
                  <p className="mt-2 text-[13px] text-ink-500">Activity will appear here as your team works.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {company.recentActivity.map((item) => (
                      <li key={item.id} className="text-[13px] text-ink-700">
                        {item.label}{' '}
                        <span className="text-ink-400">{formatDateTime(item.at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </SheetBody>

            <footer className="mt-auto border-t border-line px-5 py-3 text-[12px] text-ink-500">
              Owner {company.owner.fullName} · Created {formatDateTime(company.createdAt)}
            </footer>

            <LinkContactDialog
              open={linkOpen}
              onOpenChange={setLinkOpen}
              companyId={company.id}
              onLinked={refreshCompany}
            />
            <AddContactDialog
              open={addContactOpen}
              onOpenChange={setAddContactOpen}
              role={role}
              userId={userId}
              defaultCompanyId={company.id}
              defaultCompanyName={company.displayName}
              onCreated={(contactId) => {
                refreshCompany();
                setAddContactOpen(false);
                const params = new URLSearchParams(searchParams.toString());
                params.delete('company');
                params.set('contact', contactId);
                router.push(`/contacts?${params.toString()}`);
              }}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
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

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-500">{label}</dt>
      <dd className="flex items-center gap-1 font-medium text-ink-900">
        {value}
        <button
          type="button"
          className="grid size-7 place-items-center rounded-lg text-ink-500 hover:bg-soft"
          onClick={() => copyText(label, value)}
        >
          <Copy className="size-3.5" />
        </button>
      </dd>
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
