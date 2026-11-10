import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ContentPanel } from '@/components/layouts/app-header';
import { Button } from '@/components/ui/button';
import {
  getActiveSession,
  getSignedInUserWithoutMembership,
} from '@/server/auth/require-session';
import { signOutAction } from '@/server/actions/auth';

export const metadata: Metadata = { title: 'No access' };

export default async function NoAccessPage() {
  const session = await getActiveSession();
  if (session) {
    redirect('/opportunities');
  }

  const user = await getSignedInUserWithoutMembership();
  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="app-shell flex min-h-dvh items-center justify-center p-6">
      <ContentPanel className="max-w-lg">
        <h1 className="text-[22px] font-bold text-ink-900">
          You don&apos;t have access to the CRM
        </h1>
        <p className="mt-2 text-[14px] text-ink-500">
          You are signed in as {user.email}, but you are not a member of any CRM
          organisation yet. Ask an Admin to invite you, or create a new
          workspace.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/sign-up">Create a workspace</Link>
          </Button>
          <form
            action={async () => {
              'use server';
              await signOutAction();
              redirect('/sign-in');
            }}
          >
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </div>
      </ContentPanel>
    </div>
  );
}
