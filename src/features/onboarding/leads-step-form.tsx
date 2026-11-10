'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { OnboardingFormSection } from '@/components/onboarding/onboarding-layout';
import { OnboardingStepFooter } from '@/components/onboarding/onboarding-step-footer';
import { AuthInput } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ONBOARDING_STEP } from '@/domain/onboarding/steps';
import {
  addLeadStepAction,
  skipOptionalOnboardingStepAction,
} from '@/server/actions/onboarding';

export function LeadsStepForm({
  backHref,
  backLabel,
}: {
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
      email: String(formData.get('email') ?? ''),
      title: String(formData.get('title') ?? ''),
      valuePence: formData.get('valuePence')
        ? Number(formData.get('valuePence'))
        : undefined,
      marketingConsent: formData.get('marketingConsent') === 'on',
    };
    startTransition(async () => {
      const result = await addLeadStepAction(payload);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(result.data.nextPath);
      router.refresh();
    });
  }

  function skip() {
    startTransition(async () => {
      const result = await skipOptionalOnboardingStepAction(ONBOARDING_STEP.leads);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(result.data.nextPath);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <OnboardingFormSection
        title="First lead"
        description="Add one sponsor or prospect so your pipeline is not empty on day one."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="displayName">Contact name</Label>
            <AuthInput id="displayName" name="displayName" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <AuthInput id="email" name="email" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="valuePence">Deal value (pence, optional)</Label>
            <AuthInput id="valuePence" name="valuePence" inputMode="numeric" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Opportunity title</Label>
            <AuthInput
              id="title"
              name="title"
              placeholder="e.g. 2026 shirt sponsorship"
              required
            />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="marketingConsent" className="size-4 rounded border-line" />
            <span className="text-[13px] font-medium text-ink-700">
              They agreed to marketing contact (GDPR)
            </span>
          </label>
        </div>
      </OnboardingFormSection>
      {error ? (
        <p className="text-[13px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      <OnboardingStepFooter backHref={backHref} backLabel={backLabel} embedded>
        <Button type="submit" variant="primary" disabled={pending} className="min-h-11">
          {pending ? 'Saving…' : 'Save lead & continue'}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={skip}>
          Skip for now
        </Button>
      </OnboardingStepFooter>
    </form>
  );
}
