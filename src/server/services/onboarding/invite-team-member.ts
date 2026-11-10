import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { ONBOARDING_STEP } from '@/domain/onboarding/steps';
import { buildInviteAcceptUrl } from '@/server/email/send-team-invite';
import { writeAudit } from '@/server/audit/write';
import { memberInvitation } from '@/server/db/schema';
import type { CrmRole } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { markOnboardingStepComplete } from '@/server/services/onboarding/progress';

const INVITE_TTL_DAYS = 14;

export type InviteTeamMemberInput = {
  email: string;
  role: CrmRole;
};

export type InviteTeamMemberResult = {
  nextPath: string;
  inviteUrl: string;
  invitationId: string;
};

export async function inviteTeamMemberDuringOnboarding(
  tx: DbTransaction,
  session: TenantSession,
  input: InviteTeamMemberInput,
  options?: { completeOnboardingStep?: boolean },
): Promise<InviteTeamMemberResult> {
  const email = input.email.trim().toLowerCase();
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
  const inviteUrl = buildInviteAcceptUrl(token);

  const [existing] = await tx
    .select()
    .from(memberInvitation)
    .where(
      and(
        eq(memberInvitation.orgId, session.orgId),
        eq(memberInvitation.email, email),
        eq(memberInvitation.status, 'pending'),
      ),
    )
    .limit(1);

  let invitationId: string;
  if (existing) {
    await tx
      .update(memberInvitation)
      .set({
        role: input.role,
        tokenHash,
        expiresAt,
        invitedBy: session.userId,
      })
      .where(eq(memberInvitation.id, existing.id));
    invitationId = existing.id;
  } else {
    const [created] = await tx
      .insert(memberInvitation)
      .values({
        orgId: session.orgId,
        email,
        role: input.role,
        status: 'pending',
        invitedBy: session.userId,
        tokenHash,
        expiresAt,
      })
      .returning({ id: memberInvitation.id });
    invitationId = created!.id;
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'onboarding.team_invited',
    entityType: 'member_invitation',
    entityId: invitationId,
    changes: { email: { to: email }, role: { to: input.role } },
  });

  const completeStep = options?.completeOnboardingStep ?? true;
  const nextPath = completeStep
    ? await markOnboardingStepComplete(tx, session, ONBOARDING_STEP.team)
    : '/getting-started';

  return { nextPath, inviteUrl, invitationId };
}
