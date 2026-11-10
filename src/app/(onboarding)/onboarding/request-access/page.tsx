import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard, AuthPageFrame } from '@/components/auth/auth-layout';
import { OnboardingAccountMenu } from '@/components/onboarding/onboarding-account-menu';
import { Button } from '@/components/ui/button';
import { RequestAccessForm } from '@/features/onboarding/request-access-form';
import { getActiveSession } from '@/server/auth/require-session';

export default async function RequestAccessPage() {
  const session = await getActiveSession();
  if (!session) {
    redirect('/sign-in');
  }

  return (
    <AuthPageFrame>
      <div className="mb-6 flex justify-end">
        <OnboardingAccountMenu email={session.email} fullName={session.fullName} />
      </div>
      <AuthCard>
        <h1 className="text-[22px] font-extrabold text-ink-900">Request access</h1>
        <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-ink-600">
          Your account is not linked to a CRM organisation yet. Ask your admin to invite
          you, or contact{' '}
          <a className="font-bold text-brand-600 underline" href="mailto:support@sponsoro.co.uk">
            support@sponsoro.co.uk
          </a>{' '}
          if you need help.
        </p>
        <RequestAccessForm />
        <div className="mt-4">
          <Button variant="primary" asChild>
            <Link href="/sign-out">Sign out</Link>
          </Button>
        </div>
      </AuthCard>
    </AuthPageFrame>
  );
}
