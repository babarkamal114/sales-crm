import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { GoogleCompleteSignUpForm } from '@/features/auth/components/google-complete-sign-up-form';
import { googleAuthLandingPath } from '@/lib/auth/google-oauth';
import { readGooglePendingProfileCookie } from '@/server/auth/google-oauth-cookies';

export const metadata: Metadata = { title: 'Finish Google sign-up' };

export default async function GoogleSignUpPage() {
  const pending = await readGooglePendingProfileCookie();

  if (!pending) {
    redirect(googleAuthLandingPath('sign-up', 'expired'));
  }

  return (
    <AuthPageShell>
      <GoogleCompleteSignUpForm
        email={pending.email}
        defaultFullName={pending.name}
      />
    </AuthPageShell>
  );
}
