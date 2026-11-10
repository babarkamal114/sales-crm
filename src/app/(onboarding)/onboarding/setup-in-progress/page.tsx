import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard, AuthPageFrame } from '@/components/auth/auth-layout';
import { OnboardingAccountMenu } from '@/components/onboarding/onboarding-account-menu';
import { Button } from '@/components/ui/button';
import { resolveEntry } from '@/domain/onboarding/resolve-entry';
import { getActiveSession } from '@/server/auth/require-session';
import { loadEntryContext } from '@/server/onboarding/load-entry-context';

export default async function SetupInProgressPage() {
  const session = await getActiveSession();
  if (!session) {
    redirect('/sign-in');
  }

  const context = await loadEntryContext(session);
  const entry = resolveEntry(context);
  const org = context.organisations.find((o) => o.orgId === session.orgId);
  const starter = org?.setupStartedByName;

  return (
    <AuthPageFrame>
      <div className="mb-6 flex justify-end">
        <OnboardingAccountMenu email={session.email} fullName={session.fullName} />
      </div>
      <AuthCard>
        <h1 className="text-[22px] font-extrabold text-ink-900">Setup in progress</h1>
        <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-ink-600">
          {starter
            ? `${starter} is finishing CRM setup for this organisation. You'll get access when onboarding is complete.`
            : 'An administrator is finishing CRM setup for this organisation.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="ghost" asChild>
            <Link href="/sign-out">Sign out</Link>
          </Button>
          {entry.situation !== 'blocked_colleague_onboarding' ? (
            <Button variant="primary" asChild>
              <Link href="/onboarding/profile">Continue setup</Link>
            </Button>
          ) : null}
        </div>
      </AuthCard>
    </AuthPageFrame>
  );
}
