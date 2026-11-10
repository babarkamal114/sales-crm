import { NextResponse } from 'next/server';
import { ForbiddenError, NotFoundError } from '@/server/access/capabilities';

export function handleApiError(error: unknown) {
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message, code: 'NOT_FOUND' }, { status: 404 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message, code: 'FORBIDDEN' }, { status: 403 });
  }
  if (error instanceof Error && (error as Error & { code?: string }).code === 'CONFLICT') {
    return NextResponse.json({ error: error.message, code: 'CONFLICT' }, { status: 409 });
  }
  console.error(error);
  return NextResponse.json({ error: 'Internal error', code: 'INTERNAL' }, { status: 500 });
}
