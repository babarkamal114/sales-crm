import { actionFailure, type ActionResult } from '@/lib/action-result';
import { ForbiddenError, NotFoundError } from '@/server/access/capabilities';
import { DuplicateContactError } from '@/server/services/contacts/create-contact';
import { VersionConflictError } from '@/server/services/contacts/contact-access';

export function handleContactActionError(error: unknown): ActionResult<never> | null {
  if (error instanceof NotFoundError) {
    return actionFailure('NOT_FOUND', error.message);
  }
  if (error instanceof ForbiddenError) {
    return actionFailure('FORBIDDEN', error.message);
  }
  if (error instanceof DuplicateContactError) {
    return {
      ...actionFailure('CONFLICT', error.message),
      data: { contactId: error.matchingContactId },
    } as ActionResult<never>;
  }
  if (error instanceof VersionConflictError) {
    return actionFailure('CONFLICT', error.message);
  }
  if (error instanceof Error && (error as Error & { code?: string }).code === 'CONFLICT') {
    return actionFailure('CONFLICT', error.message);
  }
  if (error instanceof Error && error.message.includes('restricted')) {
    return actionFailure('FORBIDDEN', error.message);
  }
  return null;
}
