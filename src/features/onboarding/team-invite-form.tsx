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
  inviteTeamStepAction,
  skipOptionalOnboardingStepAction,
} from '@/server/actions/onboarding';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
] as const;

export function TeamInviteForm({
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
      email: String(formData.get('email') ?? ''),
      role: String(formData.get('role') ?? 'member') as 'admin' | 'manager' | 'member',
    };
    startTransition(async () => {
      const result = await inviteTeamStepAction(payload);
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
      const result = await skipOptionalOnboardingStepAction(ONBOARDING_STEP.team);
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
        title="Invite a teammate"
        description="We store a pending invitation — email delivery will use your org mail settings later."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">Work email</Label>
            <AuthInput id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue="member"
              className="h-12 w-full rounded-2xl border border-line bg-soft/30 px-4 text-[14px] font-medium text-ink-900"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </OnboardingFormSection>
      {error ? (
        <p className="text-[13px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      <OnboardingStepFooter backHref={backHref} backLabel={backLabel} embedded>
        <Button type="submit" variant="primary" disabled={pending} className="min-h-11">
          {pending ? 'Sending…' : 'Send invite & continue'}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={skip}>
          Skip for now
        </Button>
      </OnboardingStepFooter>
    </form>
  );
}
