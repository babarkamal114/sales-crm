import {
  ForbiddenError,
  NotFoundError,
} from '@/server/access/capabilities';
import { actionFailure } from '@/lib/action-result';
import { CompanyVersionConflictError } from '@/server/services/companies/company-access';

export function handleCompanyActionError(error: unknown) {
  if (error instanceof CompanyVersionConflictError) {
    return actionFailure('CONFLICT', error.message);
  }
  if (error instanceof NotFoundError) {
    return actionFailure('NOT_FOUND', error.message);
  }
  if (error instanceof ForbiddenError) {
    return actionFailure('FORBIDDEN', error.message);
  }
  if (error instanceof Error && error.message.includes('tag')) {
    return actionFailure('VALIDATION_FAILED', error.message);
  }
  return null;
}
