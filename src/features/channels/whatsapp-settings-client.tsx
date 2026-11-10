'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { AuthInput } from '@/components/auth/auth-layout';
import { Label } from '@/components/ui/label';
import {
  completeManagedWhatsAppSimulatorAction,
  connectByoMetaWhatsAppAction,
  submitWhatsAppTemplateDraftAction,
  syncWhatsAppTemplatesAction,
} from '@/server/actions/channels/whatsapp';
import type { WhatsAppChannelDetail } from '@/domain/channels/whatsapp-detail';

async function fetchDetail(): Promise<WhatsAppChannelDetail> {
  const res = await fetch('/api/v1/channels/whatsapp');
  if (!res.ok) throw new Error('Failed');
  return res.json() as Promise<WhatsAppChannelDetail>;
}

export function WhatsAppSettingsClient() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['channels', 'whatsapp'], queryFn: fetchDetail });
  const [pending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState('');
  const [byo, setByo] = useState({
    wabaId: '',
    phoneNumberId: '',
    accessToken: '',
    appSecret: '',
  });
  const [draftName, setDraftName] = useState('');
  const [draftBody, setDraftBody] = useState('');

  function reload() {
    void queryClient.invalidateQueries({ queryKey: ['channels', 'whatsapp'] });
    void queryClient.invalidateQueries({ queryKey: ['channels', 'overview'] });
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-[13px] text-ink-500">
        <Loader2 className="size-4 animate-spin" />
        Loading WhatsApp…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <p className="text-[13px] text-rose-700">
        Could not load WhatsApp settings.{' '}
        <button type="button" className="underline" onClick={() => void query.refetch()}>
          Retry
        </button>
      </p>
    );
  }

  const d = query.data;
  const connected = d.connection?.status === 'active' && d.sender;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/settings/channels" className="text-[13px] font-semibold text-brand-700 hover:underline">
          ← Channels
        </Link>
        <h1 className="mt-2 text-[22px] font-extrabold text-ink-900">WhatsApp</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Managed WhatsApp uses Twilio as Tech Provider with Meta Embedded Signup. Bring-your-own
          connects your Meta app directly.
        </p>
      </div>

      {!d.featureEnabled ? (
        <div className="rounded-xl2 border border-amber-200 bg-amber-50/80 p-4 text-[13px] text-amber-900">
          Managed WhatsApp is not enabled for this workspace. Set{' '}
          <code className="rounded bg-white/80 px-1">CHANNELS_MANAGED_WHATSAPP=1</code> (or{' '}
          <code className="rounded bg-white/80 px-1">CHANNELS_USE_FAKE=1</code> in local dev) to
          try the simulator.
        </div>
      ) : null}

      {connected ? (
        <section className="rounded-xl2 border border-line/70 bg-white p-5 shadow-panel">
          <h2 className="text-[15px] font-extrabold text-ink-900">Sender</h2>
          <p className="mt-2 text-[13px] font-semibold text-ink-800">
            {d.sender!.displayName ?? 'Business profile'} · {d.sender!.phoneNumberId}
          </p>
          <ul className="mt-3 space-y-1 text-[13px] text-ink-600">
            <li>
              Display name: {d.sender!.displayNameStatus ?? 'unknown'}
              {d.sender!.displayNameStatus === 'pending' ? (
                <span className="ml-2 text-amber-700">Awaiting Meta approval</span>
              ) : null}
            </li>
            <li>Quality: {d.sender!.qualityRating ?? '—'}</li>
            <li>Messaging limit: {d.sender!.messagingLimitTier ?? '—'}</li>
            <li>
              Mode: {d.connection!.mode === 'managed' ? 'Managed (Twilio)' : 'Bring your own'}
            </li>
          </ul>
          {d.sender!.qualityRating === 'YELLOW' || d.sender!.qualityRating === 'RED' ? (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
              Quality rating needs attention — reduce outbound volume and review template content.
            </p>
          ) : null}
        </section>
      ) : d.featureEnabled ? (
        <section className="rounded-xl2 border border-line/70 bg-white p-5 shadow-panel space-y-4">
          <h2 className="text-[15px] font-extrabold text-ink-900">Connect</h2>
          {d.liveEmbeddedSignup ? (
            <p className="text-[13px] text-ink-600">
              Live Embedded Signup is configured. Open the Twilio/Meta flow from your Twilio console
              (UI hook lands in a later release).
            </p>
          ) : (
            <>
              <p className="text-[13px] text-ink-600">
                Simulator (local / fake): creates a managed connection and sample sender without Meta.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <Label htmlFor="wa-display">Display name</Label>
                  <AuthInput
                    id="wa-display"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your brand on WhatsApp"
                  />
                </div>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const r = await completeManagedWhatsAppSimulatorAction({
                        displayName: displayName || undefined,
                      });
                      if (!r.ok) alert(r.error.message);
                      else reload();
                    });
                  }}
                >
                  Run simulator connect
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}

      <section className="rounded-xl2 border border-line/70 bg-white p-5 shadow-panel space-y-4">
        <h2 className="text-[15px] font-extrabold text-ink-900">Bring your own Meta</h2>
        <p className="text-[13px] text-ink-500">Admin only. Tokens are stored encrypted.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="waba">WABA ID</Label>
            <AuthInput
              id="waba"
              value={byo.wabaId}
              onChange={(e) => setByo((s) => ({ ...s, wabaId: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="pn">Phone number ID</Label>
            <AuthInput
              id="pn"
              value={byo.phoneNumberId}
              onChange={(e) => setByo((s) => ({ ...s, phoneNumberId: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="token">Access token</Label>
            <AuthInput
              id="token"
              type="password"
              value={byo.accessToken}
              onChange={(e) => setByo((s) => ({ ...s, accessToken: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="secret">App secret</Label>
            <AuthInput
              id="secret"
              type="password"
              value={byo.appSecret}
              onChange={(e) => setByo((s) => ({ ...s, appSecret: e.target.value }))}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const r = await connectByoMetaWhatsAppAction(byo);
              if (!r.ok) alert(r.error.message);
              else reload();
            });
          }}
        >
          Connect BYO Meta
        </Button>
      </section>

      <section className="rounded-xl2 border border-line/70 bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-extrabold text-ink-900">Message templates</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const r = await syncWhatsAppTemplatesAction();
                if (!r.ok) alert(r.error.message);
                else reload();
              });
            }}
          >
            Sync from provider
          </Button>
        </div>
        {d.templates.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-500">No templates yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70">
            {d.templates.map((t) => (
              <li key={t.id} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <b className="text-[13px] font-semibold text-ink-900">{t.name}</b>
                  <span
                    className={
                      t.whatsappStatus === 'approved'
                        ? 'text-[11px] font-bold uppercase text-mint-700'
                        : t.whatsappStatus === 'rejected'
                          ? 'text-[11px] font-bold uppercase text-rose-700'
                          : 'text-[11px] font-bold uppercase text-amber-700'
                    }
                  >
                    {t.whatsappStatus ?? 'draft'}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-ink-500">{t.whatsappTemplateName}</p>
                <p className="mt-1 text-[13px] text-ink-700">{t.body}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 space-y-3 border-t border-line/70 pt-4">
          <h3 className="text-[13px] font-bold text-ink-800">Submit draft template</h3>
          <div>
            <Label htmlFor="tpl-name">Name</Label>
            <AuthInput
              id="tpl-name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tpl-body">Body</Label>
            <textarea
              id="tpl-body"
              rows={3}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-[13px]"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const r = await submitWhatsAppTemplateDraftAction({
                  name: draftName,
                  body: draftBody,
                });
                if (!r.ok) alert(r.error.message);
                else {
                  setDraftName('');
                  setDraftBody('');
                  reload();
                }
              });
            }}
          >
            Save as pending
          </Button>
        </div>
      </section>
    </div>
  );
}
