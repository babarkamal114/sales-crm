'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { OnboardingFormSection } from '@/components/onboarding/onboarding-layout';
import { OnboardingStepFooter } from '@/components/onboarding/onboarding-step-footer';
import { AuthInput } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { saveProfileStepAction } from '@/server/actions/onboarding';

const TIME_ZONES = [
  'Europe/London',
  'Europe/Dublin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
] as const;

export function ProfileStepForm({
  initial,
  backHref,
  backLabel,
}: {
  initial: {
    fullName: string;
    jobTitle: string;
    phoneE164: string;
    timeZone: string;
  };
  backHref: string | null;
  backLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    const payload = {
      fullName: String(formData.get('fullName') ?? ''),
      jobTitle: String(formData.get('jobTitle') ?? ''),
      phoneE164: String(formData.get('phoneE164') ?? ''),
      timeZone: String(formData.get('timeZone') ?? 'Europe/London'),
    };

    startTransition(async () => {
      const result = await saveProfileStepAction(payload);
      if (!result.ok) {
        if (result.error.field) {
          setFieldErrors({ [result.error.field]: result.error.message });
        } else {
          setError(result.error.message);
        }
        return;
      }
      router.push(result.data.nextPath);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-8">
      <OnboardingFormSection
        title="About you"
        description="Visible to teammates in your organisation."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fullName">Full name</Label>
        <AuthInput
          id="fullName"
          name="fullName"
          defaultValue={initial.fullName}
          autoComplete="name"
          required
          aria-invalid={Boolean(fieldErrors.fullName)}
        />
            {fieldErrors.fullName ? (
              <p className="text-[12px] font-medium text-rose-600">{fieldErrors.fullName}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobTitle">Job title</Label>
            <AuthInput
              id="jobTitle"
              name="jobTitle"
              defaultValue={initial.jobTitle}
              autoComplete="organization-title"
              placeholder="e.g. Partnerships Manager"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phoneE164">Phone</Label>
            <AuthInput
              id="phoneE164"
              name="phoneE164"
              type="tel"
              defaultValue={initial.phoneE164}
              autoComplete="tel"
              placeholder="+44 7700 900000"
            />
            <p className="text-[11px] font-medium text-ink-400">Optional</p>
          </div>
        </div>
      </OnboardingFormSection>

      <OnboardingFormSection
        title="Regional settings"
        description="Used for dates and reminders."
      >
        <div className="max-w-md space-y-1.5">
          <Label htmlFor="timeZone">Time zone</Label>
          <select
            id="timeZone"
            name="timeZone"
            defaultValue={initial.timeZone || 'Europe/London'}
            className="h-12 w-full rounded-2xl border border-line bg-soft/30 px-4 text-[14px] font-medium text-ink-900 transition-colors focus:border-brand-300 focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {TIME_ZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </OnboardingFormSection>

      {error ? (
        <p className="-mt-4 text-[13px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      <OnboardingStepFooter backHref={backHref} backLabel={backLabel} embedded>
        <Button
          type="submit"
          variant="primary"
          disabled={pending}
          className="inline-flex min-h-11 min-w-[140px] gap-2"
        >
          {pending ? 'Saving…' : 'Continue'}
        </Button>
      </OnboardingStepFooter>
    </form>
  );
}
