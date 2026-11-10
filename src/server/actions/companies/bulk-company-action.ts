'use server';

import { bulkCompanyActionSchema } from '@/domain/companies/mutation-schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { handleCompanyActionError } from '@/server/actions/companies/handle-company-action-error';
import { runBulkCompanyAction } from '@/server/services/companies/bulk-company-actions';

export async function bulkCompanyAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = bulkCompanyActionSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      runBulkCompanyAction(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleCompanyActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}
