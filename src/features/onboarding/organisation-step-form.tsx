'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { OnboardingFormSection } from '@/components/onboarding/onboarding-layout';
import { OnboardingStepFooter } from '@/components/onboarding/onboarding-step-footer';
import { AuthInput } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  CONTACT_CHANNEL_OPTIONS,
  LEAD_SOURCE_OPTIONS,
} from '@/domain/onboarding/lead-sources';
import { saveOrganisationStepAction } from '@/server/actions/onboarding';

const TEAM_SIZE_OPTIONS = [
  { value: '', label: 'Select team size' },
  { value: '1-5', label: '1–5 people' },
  { value: '6-20', label: '6–20 people' },
  { value: '21-50', label: '21–50 people' },
  { value: '51+', label: '51+ people' },
] as const;

const INDUSTRY_SUGGESTIONS = [
  'Sport & entertainment',
  'Media & broadcast',
  'Agency',
  'Charity & events',
  'Other',
] as const;

export function OrganisationStepForm({
  initial,
  backHref,
  backLabel,
}: {
  initial: {
    displayName: string;
    industry: string;
    teamSizeBand: string;
    country: string;
    currency: string;
    timeZone: string;
    postalAddress: string;
    leadSources: string[];
    contactChannels: string[];
  };
  backHref: string | null;
  backLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      displayName: String(formData.get('displayName') ?? ''),
      industry: String(formData.get('industry') ?? ''),
      teamSizeBand: String(formData.get('teamSizeBand') ?? ''),
      country: String(formData.get('country') ?? 'GB'),
      currency: String(formData.get('currency') ?? 'GBP'),
      timeZone: String(formData.get('timeZone') ?? 'Europe/London'),
      postalAddress: String(formData.get('postalAddress') ?? ''),
      leadSources: formData.getAll('leadSources').map(String),
      contactChannels: formData.getAll('contactChannels').map(String),
    };
    startTransition(async () => {
      const result = await saveOrganisationStepAction(payload);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(result.data.nextPath);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-8">
      <OnboardingFormSection
        title="Public name"
        description="How sponsors and your team see your organisation."
      >
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Organisation name</Label>
          <AuthInput
            id="displayName"
            name="displayName"
            defaultValue={initial.displayName}
            required
            className="text-[15px] font-semibold"
          />
        </div>
      </OnboardingFormSection>

      <OnboardingFormSection title="Context" description="Helps us tailor defaults.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <AuthInput
              id="industry"
              name="industry"
              list="industry-suggestions"
              defaultValue={initial.industry}
              placeholder="e.g. Sport & entertainment"
            />
            <datalist id="industry-suggestions">
              {INDUSTRY_SUGGESTIONS.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teamSizeBand">Team size</Label>
            <select
              id="teamSizeBand"
              name="teamSizeBand"
              defaultValue={initial.teamSizeBand}
              className="h-12 w-full rounded-2xl border border-line bg-soft/30 px-4 text-[14px] font-medium text-ink-900 transition-colors focus:border-brand-300 focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {TEAM_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value || 'empty'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </OnboardingFormSection>

      <OnboardingFormSection title="Region" description="Used for currency and scheduling defaults.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <AuthInput id="country" name="country" defaultValue={initial.country} maxLength={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <AuthInput id="currency" name="currency" defaultValue={initial.currency} maxLength={3} />
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="timeZone">Timezone</Label>
            <AuthInput id="timeZone" name="timeZone" defaultValue={initial.timeZone} />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="postalAddress">Postal address (optional)</Label>
            <AuthInput id="postalAddress" name="postalAddress" defaultValue={initial.postalAddress} />
          </div>
        </div>
      </OnboardingFormSection>

      <OnboardingFormSection
        title="Where leads come from"
        description="We use this to suggest integrations on the next steps."
      >
        <div className="flex flex-wrap gap-2">
          {LEAD_SOURCE_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-700 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50"
            >
              <input
                type="checkbox"
                name="leadSources"
                value={opt.id}
                defaultChecked={initial.leadSources.includes(opt.id)}
                className="size-3.5 rounded border-line"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </OnboardingFormSection>

      <OnboardingFormSection title="How you contact sponsors">
        <div className="flex flex-wrap gap-2">
          {CONTACT_CHANNEL_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-700 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50"
            >
              <input
                type="checkbox"
                name="contactChannels"
                value={opt.id}
                defaultChecked={initial.contactChannels.includes(opt.id)}
                className="size-3.5 rounded border-line"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </OnboardingFormSection>

      {error ? (
        <p className="-mt-4 text-[13px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      <OnboardingStepFooter backHref={backHref} backLabel={backLabel} embedded>
        <Button type="submit" variant="primary" disabled={pending} className="min-h-11 min-w-[140px]">
          {pending ? 'Saving…' : 'Continue'}
        </Button>
      </OnboardingStepFooter>
    </form>
  );
}
