'use client';

import Link from 'next/link';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { CompanyDetail } from '@/domain/companies/detail-view';
import {
  COMPANY_COUNTRY_OPTIONS,
  COMPANY_LIFECYCLE_OPTIONS,
  COMPANY_SIZE_BANDS,
} from '@/domain/companies/form-constants';
import { formatDateTime } from '@/features/opportunities/lib/format-duration';

const lifecycleLabel = Object.fromEntries(
  COMPANY_LIFECYCLE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<string, string>;

const countryLabel = Object.fromEntries(
  COMPANY_COUNTRY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<string, string>;

const sizeLabel = Object.fromEntries(
  COMPANY_SIZE_BANDS.map((o) => [o.value, `${o.label} staff`]),
) as Record<string, string>;

function formatAddress(company: CompanyDetail): string | null {
  const parts = [
    company.addressLine1,
    company.addressLine2,
    company.city,
    company.postcode,
    countryLabel[company.country] ?? company.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function CompanyDetailsReadonly({ company }: { company: CompanyDetail }) {
  const address = formatAddress(company);

  const rows: { label: string; value: string | null; href?: string; copy?: string }[] = [
    { label: 'Legal name', value: company.name },
    ...(company.domain
      ? [{ label: 'Website', value: company.domain, href: `https://${company.domain}` }]
      : [{ label: 'Website', value: null as string | null }]),
    ...(company.phoneE164
      ? [{ label: 'Phone', value: company.phoneE164, copy: company.phoneE164 }]
      : [{ label: 'Phone', value: null as string | null }]),
    { label: 'Industry', value: company.industry },
    { label: 'Size', value: company.sizeBand ? (sizeLabel[company.sizeBand] ?? company.sizeBand) : null },
    { label: 'Lifecycle', value: lifecycleLabel[company.lifecycle] ?? company.lifecycle },
    { label: 'Owner', value: company.owner.fullName },
    { label: 'Address', value: address },
    ...(company.companiesHouseNumber
      ? [
          {
            label: 'Companies House',
            value: company.companiesHouseNumber,
            copy: company.companiesHouseNumber,
          },
        ]
      : [{ label: 'Companies House', value: null as string | null }]),
    ...(company.linkedinUrl
      ? [{ label: 'LinkedIn', value: company.linkedinUrl, href: company.linkedinUrl }]
      : [{ label: 'LinkedIn', value: null as string | null }]),
    { label: 'Description', value: company.description },
    { label: 'Created', value: formatDateTime(company.createdAt) },
  ];

  return (
    <dl className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2">
      {rows.map((row) => (
        <DetailRow key={row.label} {...row} />
      ))}

      {company.extraDomains.length > 0 ? (
        <div className="sm:col-span-2">
          <dt className="text-[12px] font-semibold text-ink-500">Domains</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {company.extraDomains.map((d) => (
              <span
                key={d.domainNormalised}
                className="inline-flex items-center gap-1.5 rounded-lg bg-soft px-2.5 py-1 text-[13px] font-medium text-ink-800"
              >
                {d.domainNormalised}
                {d.isPrimary ? (
                  <span className="text-[10px] font-bold uppercase text-brand-600">Primary</span>
                ) : null}
              </span>
            ))}
          </dd>
        </div>
      ) : null}

      {company.parentCompany ? (
        <div className="sm:col-span-2">
          <dt className="text-[12px] font-semibold text-ink-500">Parent company</dt>
          <dd className="mt-0.5 text-[13px] font-medium">
            <Link
              href={`/companies/${company.parentCompany.id}`}
              className="text-brand-600 hover:underline"
            >
              {company.parentCompany.name}
            </Link>
          </dd>
        </div>
      ) : null}

      {company.tags.length > 0 ? (
        <div className="sm:col-span-2">
          <dt className="text-[12px] font-semibold text-ink-500">Tags</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {company.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[12px] font-semibold text-brand-700"
              >
                {tag.name}
              </span>
            ))}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function DetailRow({
  label,
  value,
  href,
  copy,
}: {
  label: string;
  value: string | null;
  href?: string;
  copy?: string;
}) {
  const display = value?.trim() ? value : '—';
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-semibold text-ink-500">{label}</dt>
      <dd className="mt-0.5 flex min-w-0 items-start gap-1.5 text-[13px] font-medium text-ink-900">
        {href && value ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center gap-1 truncate text-brand-600 hover:underline"
          >
            <span className="truncate">{display}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        ) : (
          <span className={label === 'Description' ? 'whitespace-pre-wrap' : 'truncate'}>
            {display}
          </span>
        )}
        {copy ? (
          <button
            type="button"
            className="shrink-0 text-ink-400 hover:text-ink-700"
            aria-label={`Copy ${label}`}
            onClick={() => {
              void navigator.clipboard.writeText(copy);
              toast.success('Copied');
            }}
          >
            <Copy className="size-3.5" />
          </button>
        ) : null}
      </dd>
    </div>
  );
}
