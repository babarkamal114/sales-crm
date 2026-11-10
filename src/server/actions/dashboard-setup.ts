'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { organisation, userProfile } from '@/server/db/schema';
import { withTenant } from '@/server/db/with-tenant';
import { sendTeamInviteEmail } from '@/server/email/send-team-invite';
import { loadWorkspaceSetupState } from '@/server/services/setup/workspace-setup-state';
import type { WorkspaceSetupState } from '@/server/services/setup/workspace-setup-state';
import { loadToolsStepIntegrations } from '@/server/onboarding/load-tools-step';
import {
  LEAD_IMPORT_MAX_ROWS,
  leadImportRowSchema,
} from '@/domain/leads/lead-import-csv';
import { addLeadDuringOnboarding } from '@/server/services/onboarding/add-lead';
import { inviteTeamMemberDuringOnboarding } from '@/server/services/onboarding/invite-team-member';
import { provisionDefaultPipeline } from '@/server/services/pipeline/provision-default-pipeline';
import type { IntegrationCardModel } from '@/server/services/integrations/list-for-org';

function requireAdminSetup(session: { role: string }) {
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can change organisation setup.');
  }
  return null;
}

export async function dashboardSetupPipelineAction(): Promise<
  ActionResult<{ pipelineId: string }>
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  const denied = requireAdminSetup(session);
  if (denied) return denied;

  const pipelineId = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      const { pipelineId: id } = await provisionDefaultPipeline(tx, session);
      return id;
    },
  );

  return actionSuccess({ pipelineId });
}

const addLeadSchema = leadImportRowSchema;

export async function dashboardSetupAddLeadAction(
  input: unknown,
): Promise<ActionResult<Record<string, never>>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  const denied = requireAdminSetup(session);
  if (denied) return denied;

  const parsed = addLeadSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure(
      'VALIDATION_FAILED',
      first?.message ?? 'Check the form and try again.',
    );
  }

  const emailRaw = parsed.data.email?.trim();
  if (emailRaw) {
    const emailCheck = z.string().email().safeParse(emailRaw);
    if (!emailCheck.success) {
      return actionFailure('VALIDATION_FAILED', 'Enter a valid email.', 'email');
    }
  }

  await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      await addLeadDuringOnboarding(tx, session, {
        displayName: parsed.data.displayName,
        title: parsed.data.title,
        marketingConsent: parsed.data.marketingConsent,
        ...(emailRaw ? { email: emailRaw } : {}),
        ...(parsed.data.phoneE164 ? { phoneE164: parsed.data.phoneE164 } : {}),
        ...(parsed.data.valuePence !== undefined
          ? { valuePence: parsed.data.valuePence }
          : {}),
      });
    },
  );

  return actionSuccess({});
}

const inviteTeamSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(['admin', 'manager', 'member']),
});

export async function getWorkspaceSetupStateAction(): Promise<
  ActionResult<WorkspaceSetupState>
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const state = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    (tx) => loadWorkspaceSetupState(tx, session.orgId),
  );

  return actionSuccess(state);
}

export async function dashboardImportLeadsAction(
  input: unknown,
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  const denied = requireAdminSetup(session);
  if (denied) return denied;

  if (!Array.isArray(input)) {
    return actionFailure('VALIDATION_FAILED', 'Import payload must be a list of leads.');
  }

  if (input.length === 0) {
    return actionFailure('VALIDATION_FAILED', 'Add at least one lead row to import.');
  }

  if (input.length > LEAD_IMPORT_MAX_ROWS) {
    return actionFailure(
      'VALIDATION_FAILED',
      `Import at most ${LEAD_IMPORT_MAX_ROWS} leads at a time.`,
    );
  }

  const rowErrors: string[] = [];
  const rows: z.infer<typeof leadImportRowSchema>[] = [];

  input.forEach((row, index) => {
    const parsed = leadImportRowSchema.safeParse(row);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid row.';
      rowErrors.push(`Row ${index + 1}: ${message}`);
      return;
    }
    rows.push(parsed.data);
  });

  if (rowErrors.length > 0) {
    const preview = rowErrors.slice(0, 8).join('\n');
    const extra =
      rowErrors.length > 8 ? `\n…and ${rowErrors.length - 8} more row errors.` : '';
    return actionFailure('VALIDATION_FAILED', `${preview}${extra}`);
  }

  let imported = 0;
  await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]!;
        const isLast = i === rows.length - 1;
        await addLeadDuringOnboarding(
          tx,
          session,
          {
            displayName: row.displayName,
            title: row.title,
            marketingConsent: row.marketingConsent,
            ...(row.email ? { email: row.email } : {}),
            ...(row.phoneE164 ? { phoneE164: row.phoneE164 } : {}),
            ...(row.valuePence !== undefined ? { valuePence: row.valuePence } : {}),
          },
          { completeLeadsStep: isLast },
        );
        imported += 1;
      }
    },
  );

  return actionSuccess({ imported, skipped: 0 });
}

export async function dashboardSetupInviteTeamAction(
  input: unknown,
): Promise<
  ActionResult<{ email: string; inviteUrl: string; emailSent: boolean }>
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  const denied = requireAdminSetup(session);
  if (denied) return denied;

  const parsed = inviteTeamSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Enter a valid email and role.');
  }

  const inviteResult = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) =>
      inviteTeamMemberDuringOnboarding(
        tx,
        session,
        {
          email: parsed.data.email,
          role: parsed.data.role,
        },
        { completeOnboardingStep: false },
      ),
  );

  const orgName = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      const [row] = await tx
        .select({ name: organisation.name })
        .from(organisation)
        .where(eq(organisation.id, session.orgId))
        .limit(1);
      return row?.name ?? 'your organisation';
    },
  );

  const emailDelivery = await withTenant(session, (tx) =>
    sendTeamInviteEmail(tx, session.orgId, {
      to: parsed.data.email,
      orgName,
      inviteUrl: inviteResult.inviteUrl,
      inviterName: session.fullName,
    }),
  );

  return actionSuccess({
    email: parsed.data.email,
    inviteUrl: inviteResult.inviteUrl,
    emailSent: emailDelivery.sent,
  });
}

export async function dashboardListIntegrationsAction(): Promise<
  ActionResult<IntegrationCardModel[]>
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can manage integrations.');
  }

  const list = await loadToolsStepIntegrations(session);
  return actionSuccess(list);
}

export async function dashboardMarkTourCompleteAction(): Promise<ActionResult<Record<string, never>>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const now = new Date();
  await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      await tx
        .update(userProfile)
        .set({
          tourCompletedAt: now,
          updatedAt: now,
        })
        .where(eq(userProfile.userId, session.userId));
    },
  );

  return actionSuccess({});
}
