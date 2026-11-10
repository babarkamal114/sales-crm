import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { MicrosoftCompleteSignUpForm } from '@/features/auth/components/microsoft-complete-sign-up-form';
import { microsoftAuthLandingPath } from '@/lib/auth/microsoft-oauth';
import { readMicrosoftPendingProfileCookie } from '@/server/auth/microsoft-oauth-cookies';

export const metadata: Metadata = { title: 'Finish Microsoft sign-up' };

export default async function MicrosoftSignUpPage() {
  const pending = await readMicrosoftPendingProfileCookie();

  if (!pending) {
    redirect(microsoftAuthLandingPath('sign-up', 'expired'));
  }

  return (
    <AuthPageShell>
      <MicrosoftCompleteSignUpForm
        email={pending.email}
        defaultFullName={pending.name}
      />
    </AuthPageShell>
  );
}
