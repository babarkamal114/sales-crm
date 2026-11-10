'use server';

import { linkContactToCompanySchema } from '@/domain/companies/schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { linkContactToCompany } from '@/server/services/companies/contact-company-link';
import { VersionConflictError } from '@/server/services/contacts/contact-access';

export async function linkContactToCompanyAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = linkContactToCompanySchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      linkContactToCompany(tx, session, {
        contactId: parsed.data.contactId,
        companyId: parsed.data.companyId,
        version: parsed.data.version,
        ...(parsed.data.isPrimary !== undefined ? { isPrimary: parsed.data.isPrimary } : {}),
        role: parsed.data.role ?? null,
      }),
    );
    return actionSuccess(result);
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return actionFailure('CONFLICT', 'Someone else updated this contact.');
    }
    if (error instanceof Error) {
      return actionFailure('INTERNAL', error.message);
    }
    throw error;
  }
}
