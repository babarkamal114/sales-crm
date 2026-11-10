'use client';

import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import type { OnboardingStepSlug } from '@/domain/onboarding/steps';
import {
  confirmPipelineStepAction,
  finalizeOnboardingAction,
  skipOptionalOnboardingStepAction,
} from '@/server/actions/onboarding';

type SimpleAction =
  | { kind: 'pipeline' }
  | { kind: 'skip'; step: OnboardingStepSlug }
  | { kind: 'finish' };

export function OnboardingStepActions({
  primaryLabel,
  action,
  showSkip,
  skipStep,
}: {
  primaryLabel: string;
  action: SimpleAction;
  showSkip?: boolean;
  skipStep?: OnboardingStepSlug;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    fn: () => Promise<
      import('@/lib/action-result').ActionResult<{ nextPath: string }>
    >,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(result.data.nextPath);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="default"
        className="min-h-11 min-w-[160px] px-6"
        disabled={pending}
        onClick={() => {
          if (action.kind === 'pipeline') {
            run(() => confirmPipelineStepAction());
          } else if (action.kind === 'finish') {
            run(() => finalizeOnboardingAction());
          } else if (action.kind === 'skip') {
            run(() => skipOptionalOnboardingStepAction(action.step));
          }
        }}
      >
        {pending ? 'Working…' : primaryLabel}
        {!pending ? <ChevronRight className="size-4" strokeWidth={2.25} aria-hidden /> : null}
      </Button>
      {showSkip && skipStep ? (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => skipOptionalOnboardingStepAction(skipStep))}
        >
          Skip for now
        </Button>
      ) : null}
      {error ? (
        <p className="w-full basis-full text-[13px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
