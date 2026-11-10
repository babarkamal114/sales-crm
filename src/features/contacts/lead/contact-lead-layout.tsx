'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import type { ContactProfile } from '@/domain/contacts/profile-view';
import {
  CONTACT_LEAD_TABS,
  contactLeadTabHref,
  type ContactLeadTabSlug,
} from '@/domain/contacts/lead-tabs';
import { ContactDuplicatesBanner } from '@/features/contacts/components/contact-duplicates-banner';
import { ContactLeadHeader } from '@/features/contacts/lead/contact-lead-header';
import { ContactLeadProfileProvider } from '@/features/contacts/lead/contact-lead-profile-context';
import { ContactProfilePanel } from '@/features/contacts/lead/contact-profile-panel';
import { ContentPanel } from '@/components/layouts/app-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

async function fetchProfile(contactId: string) {
  const response = await fetch(`/api/v1/contacts/${contactId}/profile`);
  if (!response.ok) throw new Error('Failed');
  return response.json() as Promise<ContactProfile>;
}

export function ContactLeadLayout({
  contactId,
  initialProfile,
  role,
  userId,
  orgName,
  senderName,
  children,
}: {
  contactId: string;
  initialProfile: ContactProfile;
  role: string;
  userId: string;
  orgName: string;
  senderName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const canMerge = role === 'admin' || role === 'manager';
  const { data: profile = initialProfile, refetch } = useQuery({
    queryKey: ['contact-profile', contactId],
    queryFn: () => fetchProfile(contactId),
    initialData: initialProfile,
  });

  const activeSlug = (pathname.split('/').pop() ?? 'activity') as ContactLeadTabSlug;

  return (
    <ContactLeadProfileProvider
      profile={profile}
      userId={userId}
      role={role}
      orgName={orgName}
      senderName={senderName}
    >
    <ContentPanel className="flex min-h-0 flex-col gap-4 pb-28">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Contacts
        </Link>
        <span className="hidden text-ink-300 sm:inline">/</span>
        <h1 className="min-w-0 flex-1 truncate text-[22px] font-extrabold text-ink-900">
          {profile.displayName}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-xl border border-line bg-white text-ink-600"
              aria-label="More actions"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/contacts?contact=${contactId}`}>Quick view</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ContactDuplicatesBanner
        contactId={contactId}
        contactVersion={profile.version}
        displayName={profile.displayName}
        canMerge={canMerge}
        onMerged={() => {
          void refetch();
          router.refresh();
        }}
      />

      <ContactLeadHeader
        profile={profile}
        restricted={profile.restricted}
        contactId={contactId}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start">
        <ContactProfilePanel
          profile={profile}
          role={role}
          onUpdated={() => void refetch()}
          className="hidden w-full shrink-0 lg:block lg:w-[320px]"
        />

        <div className="min-w-0 flex-1 overflow-hidden rounded-xl2 border border-line/70 bg-panel shadow-panel backdrop-blur-xl">
          <nav
            className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2"
            aria-label="Contact sections"
          >
            {CONTACT_LEAD_TABS.map((tab) => {
              const href = contactLeadTabHref(contactId, tab.slug);
              const active = activeSlug === tab.slug;
              return (
                <Link
                  key={tab.slug}
                  href={href}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center rounded-xl px-3.5 text-[13px] font-semibold transition-colors',
                    active
                      ? 'bg-ink-900 text-white'
                      : 'text-ink-500 hover:bg-soft hover:text-ink-900',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {tab.label}
                  {!tab.ready ? (
                    <span className="ml-1.5 text-[10px] font-bold uppercase opacity-60">
                      Soon
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="min-h-[320px] p-4 sm:p-5">{children}</div>
        </div>
      </div>

      <div className="lg:hidden">
        <ContactProfilePanel
          profile={profile}
          role={role}
          onUpdated={() => void refetch()}
          mobileOnly
        />
      </div>
    </ContentPanel>
    </ContactLeadProfileProvider>
  );
}
