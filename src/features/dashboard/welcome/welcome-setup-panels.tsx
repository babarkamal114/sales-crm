'use client';

import { AlertCircle, CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { AuthInput } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import type { WelcomeChecklistId } from '@/domain/dashboard/welcome-checklist';
import { LeadCsvImportPanel } from '@/features/getting-started/components/lead-csv-import-panel';
import { PipelineStagePreview } from '@/features/onboarding/pipeline-stage-preview';
import { IntegrationConnectCard } from '@/features/integrations/integration-connect-card';
import {
  dashboardListIntegrationsAction,
  dashboardMarkTourCompleteAction,
  dashboardSetupAddLeadAction,
  dashboardSetupInviteTeamAction,
  dashboardSetupPipelineAction,
  getWorkspaceSetupStateAction,
} from '@/server/actions/dashboard-setup';
import { getIntegrationProviderConfigsAction } from '@/server/actions/integrations';
import type { IntegrationProviderConfig } from '@/server/integrations/provider-config';
import type { WorkspaceSetupState } from '@/server/services/setup/workspace-setup-state';
import {
  getProfileStepInitialValues,
  saveProfileStepAction,
} from '@/server/actions/onboarding';
import type { IntegrationCardModel } from '@/server/services/integrations/list-for-org';
import type { CrmRole } from '@/server/db/schema';

const PANEL_CLASS = 'flex flex-col gap-5';
const FORM_SURFACE =
  'rounded-xl2 border border-line/60 bg-white p-5 shadow-sm sm:p-6';

const TIME_ZONES = [
  'Europe/London',
  'Europe/Dublin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
] as const;

function SetupNotice({
  message,
  tone = 'muted',
}: {
  message: string;
  tone?: 'muted' | 'success' | 'error';
}) {
  if (tone === 'success') {
    return (
      <div className="flex gap-2.5 rounded-xl2 border border-mint-200/90 bg-mint-50/90 px-3.5 py-3">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-mint-700" aria-hidden />
        <p className="text-[12.5px] font-medium leading-relaxed text-mint-900">{message}</p>
      </div>
    );
  }
  if (tone === 'error') {
    return (
      <div
        className="flex gap-2.5 rounded-xl2 border border-rose-200 bg-rose-50/90 px-3.5 py-3"
        role="alert"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden />
        <p className="text-[12.5px] font-medium leading-relaxed text-rose-800">{message}</p>
      </div>
    );
  }
  return <p className="text-[12.5px] font-medium text-ink-500">{message}</p>;
}

function InviteLinkCopy({ email, url }: { email: string; url: string }) {
  function copy() {
    void navigator.clipboard.writeText(url).then(
      () => toast.success('Invite link copied'),
      () => toast.error('Could not copy link'),
    );
  }

  return (
    <div className="space-y-2 rounded-xl2 border border-mint-200/90 bg-mint-50/90 px-3.5 py-3">
      <p className="text-[12.5px] font-semibold text-mint-900">
        Invitation ready for <span className="font-bold">{email}</span>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          readOnly
          value={url}
          className="h-10 min-w-0 flex-1 rounded-xl border border-mint-200/80 bg-white px-3 text-[12px] font-medium text-ink-700"
          aria-label="Invite link"
          onFocus={(e) => e.target.select()}
        />
        <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={copy}>
          <Copy className="size-3.5" aria-hidden />
          Copy link
        </Button>
      </div>
    </div>
  );
}

function AdminOnlyNotice() {
  return (
    <SetupNotice message="Only organisation admins can complete this step. Ask your admin to finish setup from their dashboard." />
  );
}

function PipelineSetupPanel({ onComplete }: { onComplete: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [state, setState] = useState<WorkspaceSetupState['pipeline'] | null>(null);

  useEffect(() => {
    void getWorkspaceSetupStateAction().then((result) => {
      if (result.ok) setState(result.data.pipeline);
    });
  }, [success]);

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await dashboardSetupPipelineAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSuccess(true);
      onComplete();
    });
  }

  return (
    <div className={PANEL_CLASS}>
      {state?.exists ? (
        <SetupNotice
          tone="success"
          message={`${state.name ?? 'Default pipeline'} is active with ${state.stageCount} stages. Open Opportunities to manage deals.`}
        />
      ) : (
        <div className={FORM_SURFACE}>
          <PipelineStagePreview />
        </div>
      )}
      {error ? <SetupNotice message={error} tone="error" /> : null}
      {success ? (
        <SetupNotice message="Pipeline created — open Opportunities to see your board." tone="success" />
      ) : state?.exists ? null : (
        <Button type="button" onClick={create} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Creating pipeline…
            </>
          ) : (
            'Create default pipeline'
          )}
        </Button>
      )}
    </div>
  );
}

function LeadSetupPanel({ onComplete }: { onComplete: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'single' | 'csv'>('single');

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      displayName: String(formData.get('displayName') ?? ''),
      email: String(formData.get('email') ?? ''),
      phoneE164: String(formData.get('phoneE164') ?? ''),
      title: String(formData.get('title') ?? ''),
      valuePence: formData.get('valuePence')
        ? Number(formData.get('valuePence'))
        : undefined,
      marketingConsent: formData.get('marketingConsent') === 'on',
    };
    startTransition(async () => {
      const result = await dashboardSetupAddLeadAction(payload);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onComplete();
    });
  }

  return (
    <div className={PANEL_CLASS}>
      <SegmentedControl
        label="Lead entry mode"
        value={mode}
        options={[
          { value: 'single', label: 'Add one lead' },
          { value: 'csv', label: 'Import CSV' },
        ]}
        onChange={setMode}
        className="rounded-full bg-soft/80 p-1"
      />
      {mode === 'csv' ? (
        <LeadCsvImportPanel onComplete={onComplete} error={error} setError={setError} />
      ) : (
        <form action={onSubmit} className={cn(FORM_SURFACE, 'flex flex-col gap-5')}>
          <p className="text-[12.5px] font-medium leading-relaxed text-ink-600">
            Add one sponsor or prospect — we create a contact and an open opportunity in your first
            stage.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="welcome-displayName">Contact name</Label>
              <AuthInput id="welcome-displayName" name="displayName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome-email">Email</Label>
              <AuthInput id="welcome-email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome-phoneE164">Phone (E.164, optional)</Label>
              <AuthInput id="welcome-phoneE164" name="phoneE164" placeholder="+447700900123" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome-valuePence">Deal value (pence, optional)</Label>
              <AuthInput id="welcome-valuePence" name="valuePence" inputMode="numeric" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="welcome-title">Opportunity title</Label>
              <AuthInput
                id="welcome-title"
                name="title"
                placeholder="e.g. 2026 shirt sponsorship"
                required
              />
            </div>
            <label className="flex items-center gap-2.5 sm:col-span-2">
              <input type="checkbox" name="marketingConsent" className="size-4 rounded border-line" />
              <span className="text-[12.5px] font-medium text-ink-700">
                They agreed to marketing contact (GDPR)
              </span>
            </label>
          </div>
          {error ? <SetupNotice message={error} tone="error" /> : null}
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving lead…' : 'Add lead'}
          </Button>
        </form>
      )}
    </div>
  );
}

function IntegrationSetupPanel({
  capability,
  onComplete,
}: {
  capability: 'email' | 'telephony' | 'payments';
  onComplete: () => void;
}) {
  const [integrations, setIntegrations] = useState<IntegrationCardModel[] | null>(null);
  const [configs, setConfigs] = useState<Record<string, IntegrationProviderConfig> | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  async function reload() {
    const [listResult, configResult] = await Promise.all([
      dashboardListIntegrationsAction(),
      getIntegrationProviderConfigsAction(),
    ]);
    if (!listResult.ok) {
      setLoadError(listResult.error.message);
      return;
    }
    if (configResult.ok) setConfigs(configResult.data);
    setIntegrations(
      listResult.data.filter((item) => {
        if (capability === 'email') return item.capability === 'email';
        if (capability === 'telephony') return item.capability === 'telephony';
        return item.capability === 'payments';
      }),
    );
  }

  useEffect(() => {
    void reload();
  }, [capability]);

  const intro =
    capability === 'email'
      ? 'Connect your own mailbox (Google or Microsoft). Mail sends from your account and syncs to contacts — not a shared domain or bulk sender.'
      : capability === 'telephony'
        ? 'Set up UK numbers for calls and SMS under Channels — managed by us or bring your own Twilio.'
        : 'Connect Stripe to collect sponsorship payments when deals are signed.';

  return (
    <div className={PANEL_CLASS}>
      <p className="text-[12.5px] font-medium text-ink-600">{intro}</p>
      {loadError ? <SetupNotice message={loadError} tone="error" /> : null}
      {integrations === null && !loadError ? (
        <p className="text-[12.5px] font-medium text-ink-400">Loading integrations…</p>
      ) : null}
      {integrations?.length === 0 ? (
        <SetupNotice message="No integrations available for this category." />
      ) : null}
      {capability === 'email' || capability === 'telephony' ? (
        <p className="text-[12.5px] font-medium text-ink-600">
          <a href="/settings/channels" className="font-bold text-brand-700 hover:underline">
            Open Settings → Channels
          </a>{' '}
          for status, numbers, and bring-your-own options.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {integrations?.map((item) => (
          <IntegrationConnectCard
            key={item.id}
            model={item}
            config={
              configs?.[item.id] ?? { configured: false, connectKind: 'unavailable' }
            }
            onChanged={() => {
              if (item.status !== 'connected') onComplete();
              void reload();
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TeamSetupPanel({ onComplete }: { onComplete: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<
    WorkspaceSetupState['team']['pendingInvites']
  >([]);

  useEffect(() => {
    void getWorkspaceSetupStateAction().then((result) => {
      if (result.ok) setPendingInvites(result.data.team.pendingInvites);
    });
  }, [sent]);

  function onSubmit(formData: FormData) {
    setError(null);
    setSent(null);
    const payload = {
      email: String(formData.get('email') ?? ''),
      role: String(formData.get('role') ?? 'member') as 'admin' | 'manager' | 'member',
    };
    startTransition(async () => {
      const result = await dashboardSetupInviteTeamAction(payload);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSent(result.data.email);
      setInviteUrl(result.data.inviteUrl);
      onComplete();
    });
  }

  return (
    <form action={onSubmit} className={PANEL_CLASS}>
      <p className="text-[12.5px] font-medium text-ink-600">
        Invitations are stored securely. When Google Mail is connected we email the link; otherwise
        copy the invite URL below.
      </p>
      {pendingInvites.length > 0 ? (
        <ul className="space-y-2 rounded-xl2 border border-line/60 bg-white p-3 text-[12px] font-medium text-ink-600">
          {pendingInvites.map((invite) => (
            <li
              key={invite.email}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-soft/50 px-2.5 py-2"
            >
              <span className="font-semibold text-ink-800">{invite.email}</span>
              <span className="text-ink-500">
                {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={cn(FORM_SURFACE, 'grid gap-3 sm:max-w-md')}>
        <div className="space-y-1.5">
          <Label htmlFor="welcome-invite-email">Work email</Label>
          <AuthInput id="welcome-invite-email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="welcome-invite-role">Role</Label>
          <select
            id="welcome-invite-role"
            name="role"
            defaultValue="member"
            className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-[14px] font-medium text-ink-900"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="member">Member</option>
          </select>
        </div>
      </div>
      {error ? <SetupNotice message={error} tone="error" /> : null}
      {sent && inviteUrl ? <InviteLinkCopy email={sent} url={inviteUrl} /> : null}
      {sent && !inviteUrl ? (
        <SetupNotice tone="success" message={`Invitation saved for ${sent}.`} />
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send invitation'}
      </Button>
    </form>
  );
}

function ProfileSetupPanel({ onComplete }: { onComplete: () => void }) {
  const [initial, setInitial] = useState<{
    fullName: string;
    jobTitle: string;
    phoneE164: string;
    timeZone: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getProfileStepInitialValues().then(setInitial);
  }, []);

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      fullName: String(formData.get('fullName') ?? ''),
      jobTitle: String(formData.get('jobTitle') ?? ''),
      phoneE164: String(formData.get('phoneE164') ?? ''),
      timeZone: String(formData.get('timeZone') ?? 'Europe/London'),
    };
    startTransition(async () => {
      const result = await saveProfileStepAction(payload);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onComplete();
    });
  }

  if (!initial) {
    return (
      <div className={`${PANEL_CLASS} text-[12.5px] font-medium text-ink-400`}>
        Loading profile…
      </div>
    );
  }

  return (
    <form action={onSubmit} className={PANEL_CLASS}>
      <div className={cn(FORM_SURFACE, 'grid gap-3 sm:grid-cols-2')}>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="welcome-fullName">Full name</Label>
          <AuthInput
            id="welcome-fullName"
            name="fullName"
            defaultValue={initial.fullName}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="welcome-jobTitle">Job title</Label>
          <AuthInput id="welcome-jobTitle" name="jobTitle" defaultValue={initial.jobTitle} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="welcome-phone">Phone (E.164)</Label>
          <AuthInput id="welcome-phone" name="phoneE164" defaultValue={initial.phoneE164} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="welcome-tz">Time zone</Label>
          <select
            id="welcome-tz"
            name="timeZone"
            defaultValue={initial.timeZone}
            className="h-12 w-full rounded-2xl border border-line bg-white px-4 text-[14px] font-medium text-ink-900"
          >
            {TIME_ZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? <SetupNotice message={error} tone="error" /> : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}

const TOUR_STEPS = [
  { title: 'Dashboard', detail: 'KPIs, pipeline snapshot, and tasks update as your team works.' },
  { title: 'Getting started', detail: 'Finish setup steps here without returning to onboarding.' },
  { title: 'Opportunities', detail: 'Move sponsors through stages from first touch to signed.' },
  { title: 'Contacts', detail: 'Every lead and sponsor contact lives in one searchable list.' },
] as const;

function TourSetupPanel({ onComplete }: { onComplete: () => void }) {
  const [pending, startTransition] = useTransition();
  const [stepIndex, setStepIndex] = useState(0);
  const step = TOUR_STEPS[stepIndex] ?? TOUR_STEPS[0];
  const onLast = stepIndex >= TOUR_STEPS.length - 1;

  function complete() {
    startTransition(async () => {
      const result = await dashboardMarkTourCompleteAction();
      if (result.ok) onComplete();
    });
  }

  return (
    <div className={PANEL_CLASS}>
      <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label="Tour stops">
        {TOUR_STEPS.map((item, index) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            aria-selected={index === stepIndex}
            aria-label={`${item.title}, step ${index + 1} of ${TOUR_STEPS.length}`}
            className={cn(
              'h-2 rounded-full transition-all duration-300 motion-reduce:transition-none',
              index === stepIndex ? 'w-8 bg-brand-600' : 'w-2 bg-line hover:bg-ink-300',
            )}
            onClick={() => setStepIndex(index)}
          />
        ))}
      </div>

      <div className={cn(FORM_SURFACE, 'min-h-[120px]')}>
        <p className="text-[11px] font-bold tracking-wide text-brand-600 uppercase">
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </p>
        <p className="mt-1 text-[16px] font-extrabold tracking-tight text-ink-900">{step.title}</p>
        <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-600">{step.detail}</p>
      </div>

      <ul className="grid gap-1 sm:grid-cols-2">
        {TOUR_STEPS.map((item, index) => (
          <li key={item.title}>
            <button
              type="button"
              onClick={() => setStepIndex(index)}
              className={cn(
                'w-full rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition-colors',
                index === stepIndex
                  ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200'
                  : 'text-ink-500 hover:bg-soft/80 hover:text-ink-800',
              )}
            >
              {item.title}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((n) => Math.max(0, n - 1))}
        >
          Previous
        </Button>
        {!onLast ? (
          <Button
            type="button"
            onClick={() => setStepIndex((n) => Math.min(TOUR_STEPS.length - 1, n + 1))}
          >
            Next
          </Button>
        ) : (
          <Button type="button" onClick={complete} disabled={pending}>
            {pending ? 'Saving…' : 'Mark tour complete'}
          </Button>
        )}
      </div>
    </div>
  );
}

const ADMIN_SETUP_IDS = new Set<WelcomeChecklistId>([
  'pipeline',
  'leads',
  'email',
  'calling',
  'stripe',
  'team',
]);

export function WelcomeSetupPanel({
  stepId,
  role,
  onComplete,
}: {
  stepId: WelcomeChecklistId;
  role: CrmRole;
  onComplete: () => void;
}) {
  if (ADMIN_SETUP_IDS.has(stepId) && role !== 'admin') {
    return (
      <div className={PANEL_CLASS}>
        <AdminOnlyNotice />
      </div>
    );
  }

  switch (stepId) {
    case 'pipeline':
      return <PipelineSetupPanel onComplete={onComplete} />;
    case 'leads':
      return <LeadSetupPanel onComplete={onComplete} />;
    case 'email':
      return <IntegrationSetupPanel capability="email" onComplete={onComplete} />;
    case 'calling':
      return <IntegrationSetupPanel capability="telephony" onComplete={onComplete} />;
    case 'stripe':
      return <IntegrationSetupPanel capability="payments" onComplete={onComplete} />;
    case 'team':
      return <TeamSetupPanel onComplete={onComplete} />;
    case 'profile':
      return <ProfileSetupPanel onComplete={onComplete} />;
    case 'tour':
      return <TourSetupPanel onComplete={onComplete} />;
    default:
      return null;
  }
}
