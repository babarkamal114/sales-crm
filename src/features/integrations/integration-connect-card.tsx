'use client';

import { Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { AuthInput } from '@/components/auth/auth-layout';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { integrationProviderFromId } from '@/lib/integrations/oauth-providers';
import {
  connectTwilioIntegrationAction,
  disconnectIntegrationAction,
} from '@/server/actions/integrations';
import type { IntegrationCardModel } from '@/server/services/integrations/list-for-org';
import type { IntegrationProviderConfig } from '@/server/integrations/provider-config';

export function IntegrationConnectCard({
  model,
  config,
  onChanged,
  oauthReturnPath = '/getting-started',
}: {
  model: IntegrationCardModel;
  config: IntegrationProviderConfig;
  onChanged?: () => void;
  oauthReturnPath?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const connected = model.status === 'connected';
  const oauthProvider = integrationProviderFromId(model.id);

  function connectOAuth() {
    if (!oauthProvider) return;
    const params = new URLSearchParams({ return: oauthReturnPath });
    window.location.href = `/api/integrations/${oauthProvider}/start?${params.toString()}`;
  }

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectIntegrationAction({ providerId: model.id });
      if (result.ok) onChanged?.();
    });
  }

  function connectTwilio() {
    if (!accountSid.trim() || !authToken.trim()) return;
    startTransition(async () => {
      const result = await connectTwilioIntegrationAction({
        accountSid: accountSid.trim(),
        authToken: authToken.trim(),
      });
      if (result.ok) onChanged?.();
    });
  }

  return (
    <div
      className={
        model.suggested
          ? 'rounded-xl2 border border-brand-200/80 bg-white p-4 shadow-sm ring-1 ring-brand-100/60'
          : 'rounded-xl2 border border-line bg-white p-4 shadow-sm'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-bold text-ink-900">{model.name}</p>
          <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-ink-600">
            {model.description}
          </p>
          {!config.configured && config.setupHint ? (
            <p className="mt-2 text-[11.5px] font-medium text-amber-800">{config.setupHint}</p>
          ) : null}
        </div>
        {model.suggested ? (
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800">
            Suggested
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span
          className={
            connected
              ? 'text-[11px] font-bold uppercase tracking-wide text-emerald-700'
              : model.status === 'error'
                ? 'text-[11px] font-bold uppercase tracking-wide text-rose-600'
                : 'text-[11px] font-bold uppercase tracking-wide text-ink-400'
          }
        >
          {connected ? 'Connected' : model.status === 'error' ? 'Error' : 'Not connected'}
        </span>
        <div className="flex gap-2">
          {connected ? (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={disconnect}>
              Disconnect
            </Button>
          ) : oauthProvider && config.connectKind === 'oauth' ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending || !config.configured}
              onClick={connectOAuth}
            >
              Connect
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" disabled>
              Unavailable
            </Button>
          )}
        </div>
      </div>
      {model.id === 'twilio_voice' && !connected ? (
        <div className="mt-4 grid gap-2 border-t border-line/50 pt-4">
          <div className="space-y-1">
            <Label htmlFor={`twilio-sid-${model.id}`}>Account SID</Label>
            <AuthInput
              id={`twilio-sid-${model.id}`}
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`twilio-token-${model.id}`}>Auth token</Label>
            <AuthInput
              id={`twilio-token-${model.id}`}
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
            />
          </div>
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={connectTwilio}>
            {pending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Verifying with Twilio…
              </>
            ) : (
              'Verify and connect'
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
