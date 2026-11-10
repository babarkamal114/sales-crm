'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/sonner';
import {
  organisationNameHelp,
  organisationNamePlaceholder,
} from '@/lib/auth/content';
import { completeMicrosoftSignUpAction } from '@/server/actions/oauth-auth';
import {
  AuthCard,
  AuthFooterNote,
  AuthInput,
  AuthLabel,
  AuthLink,
  AuthModeToggle,
} from '@/components/auth/auth-layout';

function SubmitArrowIcon() {
  return (
    <svg
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function MicrosoftCompleteSignUpForm({
  email,
  defaultFullName,
}: {
  email: string;
  defaultFullName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(defaultFullName);
  const [organisationName, setOrganisationName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const canSubmit =
    fullName.trim().length >= 2 &&
    organisationName.trim().length >= 2 &&
    termsAccepted &&
    !isPending;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);

    startTransition(async () => {
      const result = await completeMicrosoftSignUpAction({
        fullName,
        organisationName,
        termsAccepted,
      });

      if (!result.ok) {
        setFieldError(result.error.message);
        toast.error(result.error.message);
        return;
      }

      router.push(result.data.redirectTo);
      router.refresh();
    });
  }

  return (
    <>
      <AuthCard embedded>
        <div className="mb-7">
          <p className="text-[11.5px] font-bold tracking-wide text-brand-600 uppercase xl:text-[12px]">
            Get started
          </p>
          <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight xl:text-[28px]">
            Finish creating your workspace
          </h1>
          <p className="mt-2 text-[14px] font-medium text-ink-500 xl:text-[15px]">
            Microsoft verified {email}. Add your organisation name and accept
            the terms to continue.
          </p>
        </div>

        <form className="space-y-3.5" onSubmit={handleSubmit}>
          {fieldError ? (
            <p
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[12.5px] font-medium text-rose-700"
            >
              {fieldError}
            </p>
          ) : null}

          <div>
            <AuthLabel htmlFor="microsoft-email">Work email</AuthLabel>
            <AuthInput
              id="microsoft-email"
              type="email"
              value={email}
              readOnly
              disabled
            />
          </div>

          <div>
            <AuthLabel htmlFor="microsoft-name">Full name</AuthLabel>
            <AuthInput
              id="microsoft-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </div>

          <div>
            <AuthLabel htmlFor="microsoft-org" help={organisationNameHelp}>
              Organisation
            </AuthLabel>
            <AuthInput
              id="microsoft-org"
              type="text"
              autoComplete="organization"
              placeholder={organisationNamePlaceholder}
              value={organisationName}
              onChange={(event) => setOrganisationName(event.target.value)}
              required
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-line bg-soft/50 px-3.5 py-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded-md border-line text-brand-500 focus:ring-brand-200"
            />
            <span className="text-[11.5px] leading-snug font-medium text-ink-500">
              I agree to the{' '}
              <AuthLink href="https://sponsoro.co.uk/terms">Terms</AuthLink> and{' '}
              <AuthLink href="https://sponsoro.co.uk/privacy">
                Privacy Policy
              </AuthLink>
              , and confirm I&apos;m authorised to act for my organisation.
            </span>
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 text-[14.5px] font-bold text-white shadow-chip transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 xl:h-[50px]"
          >
            {isPending ? 'Please wait…' : 'Create account'}
            {!isPending ? <SubmitArrowIcon /> : null}
          </button>
        </form>
      </AuthCard>
      <AuthModeToggle
        prompt="Already have an account?"
        action="Sign in"
        href="/sign-in"
      />
      <AuthFooterNote />
    </>
  );
}
