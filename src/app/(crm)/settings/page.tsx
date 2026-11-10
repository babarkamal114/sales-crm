import Link from 'next/link';
import type { Metadata } from 'next';
import { ContentPanel } from '@/components/layouts/app-header';
import { requireSession } from '@/server/auth/require-session';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await requireSession();

  return (
    <ContentPanel className="space-y-5 pb-28">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">Settings</h1>
        <p className="mt-1 text-[13px] font-medium text-ink-500">
          Organisation configuration for {session.fullName}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl2 border border-line/60 bg-white p-5 shadow-panel">
          <h2 className="text-[15px] font-extrabold text-ink-900">Profile</h2>
          <p className="mt-1 text-[13px] font-medium text-ink-500">
            Update your name, timezone, and contact details.
          </p>
          <Link
            href="/getting-started"
            className="mt-3 inline-block text-[13px] font-bold text-brand-700 hover:text-brand-800"
          >
            Edit on Getting started →
          </Link>
        </section>

        <section className="rounded-xl2 border border-line/60 bg-white p-5 shadow-panel">
          <h2 className="text-[15px] font-extrabold text-ink-900">Email templates</h2>
          <p className="mt-1 text-[13px] font-medium text-ink-500">
            Outreach messages for each lifecycle step — used in the contact composer.
          </p>
          <Link
            href="/settings/email-templates"
            className="mt-3 inline-block text-[13px] font-bold text-brand-700 hover:text-brand-800"
          >
            Edit templates →
          </Link>
        </section>

        <section className="rounded-xl2 border border-line/60 bg-white p-5 shadow-panel">
          <h2 className="text-[15px] font-extrabold text-ink-900">Outreach sequences</h2>
          <p className="mt-1 text-[13px] font-medium text-ink-500">
            Cadence, delays, and reminders for lead outreach — schedule per contact on the email
            page.
          </p>
          <Link
            href="/settings/outreach-sequences"
            className="mt-3 inline-block text-[13px] font-bold text-brand-700 hover:text-brand-800"
          >
            Edit sequences →
          </Link>
        </section>

        <section className="rounded-xl2 border border-line/60 bg-white p-5 shadow-panel">
          <h2 className="text-[15px] font-extrabold text-ink-900">Channels</h2>
          <p className="mt-1 text-[13px] font-medium text-ink-500">
            Mailboxes, phone numbers, SMS, WhatsApp, and usage limits.
          </p>
          <Link
            href="/settings/channels"
            className="mt-3 inline-block text-[13px] font-bold text-brand-700 hover:text-brand-800"
          >
            Open Channels →
          </Link>
        </section>

        <section className="rounded-xl2 border border-line/60 bg-white p-5 shadow-panel">
          <h2 className="text-[15px] font-extrabold text-ink-900">Integrations</h2>
          <p className="mt-1 text-[13px] font-medium text-ink-500">
            Stripe and calendar connections (legacy setup on Getting started).
          </p>
          <Link
            href="/getting-started"
            className="mt-3 inline-block text-[13px] font-bold text-brand-700 hover:text-brand-800"
          >
            Getting started →
          </Link>
        </section>

        <section className="rounded-xl2 border border-line/60 bg-white p-5 shadow-panel">
          <h2 className="text-[15px] font-extrabold text-ink-900">Team</h2>
          <p className="mt-1 text-[13px] font-medium text-ink-500">
            Invite admins, managers, and members.
          </p>
          <Link
            href="/getting-started"
            className="mt-3 inline-block text-[13px] font-bold text-brand-700 hover:text-brand-800"
          >
            Invite teammates →
          </Link>
        </section>

        {session.role === 'admin' ? (
          <section className="rounded-xl2 border border-line/60 bg-white p-5 shadow-panel">
            <h2 className="text-[15px] font-extrabold text-ink-900">CRM</h2>
            <p className="mt-1 text-[13px] font-medium text-ink-500">
              Auto-linking contacts to companies and related defaults.
            </p>
            <Link
              href="/settings/crm"
              className="mt-3 inline-block text-[13px] font-bold text-brand-700 hover:text-brand-800"
            >
              CRM settings →
            </Link>
          </section>
        ) : null}

        <section className="rounded-xl2 border border-line/60 bg-white p-5 shadow-panel">
          <h2 className="text-[15px] font-extrabold text-ink-900">Pipeline</h2>
          <p className="mt-1 text-[13px] font-medium text-ink-500">
            Default stages and pipeline setup.
          </p>
          <Link
            href="/getting-started"
            className="mt-3 inline-block text-[13px] font-bold text-brand-700 hover:text-brand-800"
          >
            Configure pipeline →
          </Link>
        </section>
      </div>
    </ContentPanel>
  );
}
