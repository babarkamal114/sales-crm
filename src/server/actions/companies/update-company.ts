'use server';

import {
  setCompanyOwnerSchema,
  setCompanyTagsSchema,
} from '@/domain/companies/mutation-schemas';
import { updateCompanyDetailsSchema, updateCompanyFieldSchema } from '@/domain/companies/schemas';
import { actionFailure, actionSuccess } from '@/lib/action-result';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { handleCompanyActionError } from '@/server/actions/companies/handle-company-action-error';
import { setCompanyOwner } from '@/server/services/companies/set-company-owner';
import { setCompanyTags } from '@/server/services/companies/set-company-tags';
import { updateCompanyDetails } from '@/server/services/companies/update-company-details';
import {
  CompanyVersionConflictError,
  updateCompanyField,
} from '@/server/services/companies/update-company-field';

export async function updateCompanyFieldAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = updateCompanyFieldSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      updateCompanyField(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleCompanyActionError(error);
    if (mapped) return mapped;
    if (error instanceof CompanyVersionConflictError) {
      return actionFailure('CONFLICT', error.message);
    }
    throw error;
  }
}

export async function setCompanyOwnerAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = setCompanyOwnerSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      setCompanyOwner(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleCompanyActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function updateCompanyDetailsAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = updateCompanyDetailsSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      updateCompanyDetails(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleCompanyActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function setCompanyTagsAction(input: unknown) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const parsed = setCompanyTagsSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionFailure('VALIDATION_FAILED', first?.message ?? 'Check the form.');
  }

  try {
    const result = await withTenant(session, (tx) =>
      setCompanyTags(tx, session, parsed.data),
    );
    return actionSuccess(result);
  } catch (error) {
    const mapped = handleCompanyActionError(error);
    if (mapped) return mapped;
    throw error;
  }
}
