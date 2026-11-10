'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/sonner';
import type { AuthMode } from '@/lib/auth/content';
import {
  authCopy,
  organisationNameHelp,
  organisationNamePlaceholder,
} from '@/lib/auth/content';
import { isTurnstileConfiguredOnClient } from '@/lib/auth/turnstile-public';
import { signInAction, signUpAction } from '@/server/actions/auth';
import {
  AuthCard,
  AuthDivider,
  AuthFooterNote,
  AuthInput,
  AuthLabel,
  AuthLink,
  AuthModeToggle,
} from '@/components/auth/auth-layout';
import { AuthSsoButtons } from '@/components/auth/auth-sso-buttons';
import { EmailField, PasswordField } from '@/components/auth/password-field';
import type { TurnstileWidgetHandle } from '@/components/auth/turnstile-widget';

const TurnstileWidget = dynamic(
  () =>
    import('@/components/auth/turnstile-widget').then(
      (mod) => mod.TurnstileWidget,
    ),
  { ssr: false },
);

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

export function AuthForm({
  initialMode = 'sign-in',
  toggleHref,
  pageHeading,
  header,
  turnstileEnabled,
  errorNotice = null,
}: {
  initialMode?: AuthMode;
  toggleHref?: string;
  pageHeading?: string;
  header?: ReactNode;
  turnstileEnabled?: boolean;
  errorNotice?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const mode = initialMode;
  const copy = authCopy[mode];
  const isSignUp = mode === 'sign-up';

  const [name, setName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstileRequired =
    turnstileEnabled ?? isTurnstileConfiguredOnClient();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);

    if (turnstileRequired && !turnstileToken) {
      const message =
        turnstileError ??
        'Complete the security check below before continuing.';
      setFieldError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      const result = isSignUp
        ? await signUpAction({
            fullName: name,
            organisationName: organisation,
            email,
            password,
            termsAccepted,
            turnstileToken: turnstileToken ?? undefined,
          })
        : await signInAction({
            email,
            password,
            rememberMe,
            turnstileToken: turnstileToken ?? undefined,
          });

      if (!result.ok) {
        setFieldError(result.error.message);
        toast.error(result.error.message);
        turnstileRef.current?.reset();
        return;
      }

      router.push(result.data.redirectTo);
      router.refresh();
    });
  }

  const hasCredentials = email.trim().length > 0 && password.length > 0;
  const canSubmit =
    hasCredentials && (!isSignUp || termsAccepted) && !isPending;

  const headingBlock = header ?? (
    <div className="mb-7">
      <p className="text-[11.5px] font-bold tracking-wide text-brand-600 uppercase xl:text-[12px]">
        {isSignUp ? 'Get started' : 'Welcome back'}
      </p>
      <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight xl:text-[28px]">
        {pageHeading ?? copy.title}
      </h1>
      <p className="mt-2 text-[14px] font-medium text-ink-500 xl:text-[15px]">
        {copy.subtitle}
      </p>
    </div>
  );

  return (
    <>
      <AuthCard embedded>
        {headingBlock}
        <div className="min-h-[104px]">
          <AuthSsoButtons mode={mode} />
        </div>
        <AuthDivider className="my-4" />

        {errorNotice ? (
          <p
            role="alert"
            className="mb-3.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[12.5px] font-medium text-rose-700"
          >
            {errorNotice}
          </p>
        ) : null}

        <form className="space-y-3.5" onSubmit={handleSubmit}>
          {fieldError ? (
            <p
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[12.5px] font-medium text-rose-700"
            >
              {fieldError}
            </p>
          ) : null}

          {isSignUp ? (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <AuthLabel htmlFor="name">Full name</AuthLabel>
                <AuthInput
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Amara Okafor"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div>
                <AuthLabel htmlFor="org" help={organisationNameHelp}>
                  Organisation
                </AuthLabel>
                <AuthInput
                  id="org"
                  type="text"
                  autoComplete="organization"
                  placeholder={organisationNamePlaceholder}
                  value={organisation}
                  onChange={(event) => setOrganisation(event.target.value)}
                  required
                />
              </div>
            </div>
          ) : null}

          <div>
            <AuthLabel htmlFor="email">Work email</AuthLabel>
            <EmailField id="email" value={email} onChange={setEmail} />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <AuthLabel htmlFor="password" className="mb-0">
                Password
              </AuthLabel>
            </div>
            <PasswordField
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              showStrength={isSignUp}
            />
          </div>

          {isSignUp ? (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-line bg-soft/50 px-3.5 py-3">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded-md border-line text-brand-500 focus:ring-brand-200"
              />
              <span className="text-[11.5px] leading-snug font-medium text-ink-500">
                I agree to the{' '}
                <AuthLink href="https://sponsoro.co.uk/terms">Terms</AuthLink>{' '}
                and{' '}
                <AuthLink href="https://sponsoro.co.uk/privacy">
                  Privacy Policy
                </AuthLink>
                , and confirm I&apos;m authorised to act for my organisation.
              </span>
            </label>
          ) : (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-line bg-soft/50 px-3.5 py-3">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="size-4 shrink-0 rounded-md border-line text-brand-500 focus:ring-brand-200"
              />
              <span className="text-[11.5px] font-medium text-ink-500">
                Keep me signed in
              </span>
            </label>
          )}

          <div className="min-h-[65px]">
            {turnstileRequired ? (
              <TurnstileWidget
                ref={turnstileRef}
                action={isSignUp ? 'signup' : 'signin'}
                onTokenChange={setTurnstileToken}
                onWidgetError={setTurnstileError}
              />
            ) : null}
          </div>

          {turnstileRequired && turnstileError ? (
            <p
              role="alert"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12.5px] font-medium text-amber-800"
            >
              {turnstileError}
            </p>
          ) : null}

          {turnstileRequired && !turnstileToken && !turnstileError ? (
            <p className="text-center text-[11.5px] font-medium text-ink-400">
              Complete the security check above to continue.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 text-[14.5px] font-bold text-white shadow-chip transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 xl:h-[50px]"
          >
            {isPending ? 'Please wait…' : copy.submitLabel}
            {!isPending ? <SubmitArrowIcon /> : null}
          </button>
        </form>
      </AuthCard>
      <AuthModeToggle
        prompt={copy.togglePrompt}
        action={copy.toggleAction}
        href={toggleHref ?? (isSignUp ? '/sign-in' : '/sign-up')}
      />
      <AuthFooterNote />
    </>
  );
}
