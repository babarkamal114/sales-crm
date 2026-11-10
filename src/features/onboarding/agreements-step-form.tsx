'use client';

import Link from 'next/link';
import { FileText, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CRM_AGREEMENT_URLS } from '@/domain/onboarding/agreements';
import { OnboardingStepFooter } from '@/components/onboarding/onboarding-step-footer';
import { Button } from '@/components/ui/button';
import { saveAgreementsStepAction } from '@/server/actions/onboarding';
import { cn } from '@/lib/utils';

function AgreementCard({
  checked,
  onChange,
  icon: Icon,
  title,
  summary,
  href,
  linkLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: typeof FileText;
  title: string;
  summary: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer gap-4 rounded-xl2 border p-4 transition-all sm:p-5',
        checked
          ? 'border-brand-300 bg-brand-50/60 ring-1 ring-brand-200'
          : 'border-line/70 bg-white hover:border-line hover:shadow-chip',
      )}
    >
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0 rounded border-line text-brand-600 focus:ring-brand-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex min-w-0 flex-1 gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-soft">
          <Icon className="size-5 text-brand-600" strokeWidth={1.75} />
        </span>
        <span>
          <span className="block text-[14px] font-bold text-ink-900">{title}</span>
          <span className="mt-1 block text-[12.5px] font-medium leading-relaxed text-ink-500">
            {summary}{' '}
            <Link
              href={href}
              className="font-bold text-brand-600 underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {linkLabel}
            </Link>
          </span>
        </span>
      </span>
    </label>
  );
}

export function AgreementsStepForm({
  backHref,
  backLabel,
}: {
  backHref: string | null;
  backLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [dpa, setDpa] = useState(false);

  function onContinue() {
    setError(null);
    startTransition(async () => {
      const result = await saveAgreementsStepAction({
        acceptTerms: terms ? true : (false as unknown as true),
        acceptDpa: dpa ? true : (false as unknown as true),
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(result.data.nextPath);
      router.refresh();
    });
  }

  const canContinue = terms && dpa;

  return (
    <div className="space-y-5">
      <AgreementCard
        checked={terms}
        onChange={setTerms}
        icon={FileText}
        title="Terms of Service"
        summary="Use of CRM, support, and acceptable use."
        href={CRM_AGREEMENT_URLS.terms}
        linkLabel="Read terms"
      />
      <AgreementCard
        checked={dpa}
        onChange={setDpa}
        icon={Shield}
        title="Data Processing Agreement"
        summary="How we process sponsor and contact data on your behalf."
        href={CRM_AGREEMENT_URLS.dpa}
        linkLabel="Read DPA"
      />
      {error ? (
        <p className="text-[13px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      {!canContinue ? (
        <p className="text-[12px] font-medium text-ink-400">
          Select both agreements to continue.
        </p>
      ) : null}
      <OnboardingStepFooter backHref={backHref} backLabel={backLabel} embedded>
        <Button
          type="button"
          variant="primary"
          disabled={pending || !canContinue}
          onClick={onContinue}
          className="min-h-11 min-w-[160px]"
        >
          {pending ? 'Saving…' : 'Accept and continue'}
        </Button>
      </OnboardingStepFooter>
    </div>
  );
}
