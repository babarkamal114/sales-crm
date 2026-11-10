'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { OnboardingStepFooter } from '@/components/onboarding/onboarding-step-footer';
import { Button } from '@/components/ui/button';
import { ONBOARDING_STEP } from '@/domain/onboarding/steps';
import { IntegrationConnectCard } from '@/features/integrations/integration-connect-card';
import { getIntegrationProviderConfigsAction } from '@/server/actions/integrations';
import type { IntegrationProviderConfig } from '@/server/integrations/provider-config';
import {
  completeToolsStepAction,
  skipOptionalOnboardingStepAction,
} from '@/server/actions/onboarding';
import type { IntegrationCardModel } from '@/server/services/integrations/list-for-org';

export function ToolsStepPanel({
  integrations,
  backHref,
  backLabel,
}: {
  integrations: IntegrationCardModel[];
  backHref: string | null;
  backLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<
    string,
    IntegrationProviderConfig
  > | null>(null);

  useEffect(() => {
    void getIntegrationProviderConfigsAction().then((result) => {
      if (result.ok) setConfigs(result.data);
    });
  }, []);

  function continueSetup() {
    setError(null);
    startTransition(async () => {
      const result = await completeToolsStepAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(result.data.nextPath);
      router.refresh();
    });
  }

  function skip() {
    setError(null);
    startTransition(async () => {
      const result = await skipOptionalOnboardingStepAction(ONBOARDING_STEP.tools);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(result.data.nextPath);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-[13px] font-medium leading-relaxed text-ink-600">
        Connect the tools your team already uses. OAuth redirects use your configured
        Google, Microsoft, Twilio, and Stripe credentials.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {integrations.map((item) => (
          <IntegrationConnectCard
            key={item.id}
            model={item}
            config={
              configs?.[item.id] ?? { configured: false, connectKind: 'unavailable' }
            }
            onChanged={() => router.refresh()}
          />
        ))}
      </div>
      {error ? (
        <p className="text-[13px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      <OnboardingStepFooter backHref={backHref} backLabel={backLabel} embedded>
        <Button
          type="button"
          variant="primary"
          className="min-h-11 min-w-[140px]"
          disabled={pending}
          onClick={continueSetup}
        >
          {pending ? 'Working…' : 'Continue'}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={skip}>
          Skip for now
        </Button>
      </OnboardingStepFooter>
    </div>
  );
}
