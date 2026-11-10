'use server';

import {
  companyIdVersionSchema,
  mergeCompaniesSchema,
} from '@/domain/companies/mutation-schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { handleCompanyActionError } from '@/server/actions/companies/handle-company-action-error';
import { deleteCompany } from '@/server/services/companies/delete-company';
import { mergeCompanies } from '@/server/services/companies/merge-companies';

export async function deleteCompanyAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = companyIdVersionSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      deleteCompany(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleCompanyActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function mergeCompaniesAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = mergeCompaniesSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      mergeCompanies(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleCompanyActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}
