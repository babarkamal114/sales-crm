'use server';

import { eq } from 'drizzle-orm';
import { updateOrgCrmSettingsSchema } from '@/domain/companies/schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { assertCan } from '@/server/access/capabilities';
import { requireSession } from '@/server/auth/require-session';
import { organisationSettings } from '@/server/db/schema';
import { withTenant } from '@/server/db/with-tenant';

export async function updateOrgCrmSettingsAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = updateOrgCrmSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Check the form.');
  }

  try {
    assertCan(session, 'settings.pipelines.manage');
  } catch {
    return actionFailure('FORBIDDEN', 'Only admins can change CRM settings.');
  }

  const now = new Date();
  await withTenant(session, async (tx) => {
    await tx
      .update(organisationSettings)
      .set({
        ...(parsed.data.autoLinkContactsByEmailDomain !== undefined
          ? { autoLinkContactsByEmailDomain: parsed.data.autoLinkContactsByEmailDomain }
          : {}),
        ...(parsed.data.collectContactDateOfBirth !== undefined
          ? { collectContactDateOfBirth: parsed.data.collectContactDateOfBirth }
          : {}),
        updatedAt: now,
        updatedBy: session.userId,
      })
      .where(eq(organisationSettings.orgId, session.orgId));
  });

  return actionSuccess({ ok: true });
}
