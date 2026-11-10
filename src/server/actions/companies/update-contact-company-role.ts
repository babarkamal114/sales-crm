'use server';

import { updateContactCompanyRoleSchema } from '@/domain/companies/schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { updateContactCompanyRole } from '@/server/services/companies/contact-company-link';
import { VersionConflictError } from '@/server/services/contacts/contact-access';
import { NotFoundError } from '@/server/access/capabilities';

export async function updateContactCompanyRoleAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = updateContactCompanyRoleSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      updateContactCompanyRole(tx, session, {
        contactId: parsed.data.contactId,
        companyId: parsed.data.companyId,
        version: parsed.data.version,
        role: parsed.data.role?.trim() ? parsed.data.role.trim() : null,
      }),
    );
    return actionSuccess(result);
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return actionFailure('CONFLICT', 'Someone else updated this contact.');
    }
    if (error instanceof NotFoundError) {
      return actionFailure('NOT_FOUND', error.message);
    }
    if (error instanceof Error) {
      return actionFailure('INTERNAL', error.message);
    }
    throw error;
  }
}
