import Link from 'next/link';
import type { Metadata } from 'next';
import { createHash } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { AuthCard, AuthPageFrame } from '@/components/auth/auth-layout';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { Button } from '@/components/ui/button';
import { getDb } from '@/server/db/client';
import { memberInvitation, organisation } from '@/server/db/schema';

export const metadata: Metadata = { title: 'Accept invitation' };

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawToken = params.token;
  const token = typeof rawToken === 'string' ? rawToken : '';

  if (!token) {
    return (
      <AuthPageShell>
        <AuthPageFrame>
          <AuthCard>
            <h1 className="text-[26px] font-extrabold tracking-tight text-ink-900">
              Invalid invitation
            </h1>
            <p className="mt-2 text-[14px] font-medium text-ink-500">
              This link is missing a token.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href="/sign-in">Go to sign in</Link>
            </Button>
          </AuthCard>
        </AuthPageFrame>
      </AuthPageShell>
    );
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const db = getDb();
  const [invite] = await db
    .select({
      email: memberInvitation.email,
      role: memberInvitation.role,
      orgName: organisation.name,
    })
    .from(memberInvitation)
    .innerJoin(organisation, eq(memberInvitation.orgId, organisation.id))
    .where(
      and(
        eq(memberInvitation.tokenHash, tokenHash),
        eq(memberInvitation.status, 'pending'),
        gt(memberInvitation.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!invite) {
    return (
      <AuthPageShell>
        <AuthPageFrame>
          <AuthCard>
            <h1 className="text-[26px] font-extrabold tracking-tight text-ink-900">
              Invitation expired
            </h1>
            <p className="mt-2 text-[14px] font-medium text-ink-500">
              Ask your admin to send a new invite.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href="/sign-up">Create account</Link>
            </Button>
          </AuthCard>
        </AuthPageFrame>
      </AuthPageShell>
    );
  }

  const signUpParams = new URLSearchParams({
    email: invite.email,
    invite: token,
  });

  return (
    <AuthPageShell>
      <AuthPageFrame>
        <AuthCard>
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink-900">
            Join {invite.orgName}
          </h1>
          <p className="mt-2 text-[14px] font-medium text-ink-500">
            You have been invited as {invite.role}. Create an account or sign in with{' '}
            {invite.email}.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href={`/sign-up?${signUpParams.toString()}`}>Create account</Link>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/sign-in?${signUpParams.toString()}`}>Sign in</Link>
            </Button>
          </div>
        </AuthCard>
      </AuthPageFrame>
    </AuthPageShell>
  );
}
