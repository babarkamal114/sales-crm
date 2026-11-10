'use server';

import { createCompanySchema } from '@/domain/companies/schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { broadcastAffectedAfterAction } from '@/lib/entities/publish-affected-server';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import {
  CompanyConflictError,
  createCompany,
} from '@/server/services/companies/create-company';

export async function createCompanyAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) => createCompany(tx, session, parsed.data));
    const affected = [{ type: 'company' as const, id: result.id }];
    broadcastAffectedAfterAction({
      orgId: session.orgId,
      actorId: session.userId,
      affected,
    });
    return actionSuccess(result, affected);
  } catch (error) {
    if (error instanceof CompanyConflictError) {
      return actionFailure('CONFLICT', error.message, error.field);
    }
    if (error instanceof Error) {
      return actionFailure('INTERNAL', error.message);
    }
    throw error;
  }
}
