import type { Metadata } from 'next';
import { AuthPageHeading } from '@/components/auth/auth-page-heading';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { AuthForm } from '@/features/auth/components/auth-form';
import { googleOAuthErrorMessage } from '@/lib/auth/google-oauth';
import { microsoftOAuthErrorMessage } from '@/lib/auth/microsoft-oauth';
import { isTurnstileEnabled } from '@/server/auth/verify-turnstile';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; microsoft?: string }>;
}) {
  const params = await searchParams;
  const errorNotice =
    googleOAuthErrorMessage(params.google) ??
    microsoftOAuthErrorMessage(params.microsoft);

  return (
    <AuthPageShell>
      <AuthForm
        initialMode="sign-in"
        toggleHref="/sign-up"
        pageHeading="Sign in to CRM"
        header={
          <AuthPageHeading
            mode="sign-in"
            pageHeading="Sign in to CRM"
          />
        }
        turnstileEnabled={isTurnstileEnabled()}
        errorNotice={errorNotice}
      />
    </AuthPageShell>
  );
}
