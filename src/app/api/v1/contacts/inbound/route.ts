import { NextResponse, type NextRequest } from 'next/server';
import { createOrMatchContactSchema } from '@/domain/contacts/mutation-schemas';
import { getActiveSession } from '@/server/auth/require-session';
import { ForbiddenError } from '@/server/access/capabilities';
import { withTenant } from '@/server/db/with-tenant';
import { createOrMatchContact } from '@/server/services/contacts/create-or-match-contact';

export async function POST(request: NextRequest) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createOrMatchContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }

  try {
    const result = await withTenant(session, (tx) =>
      createOrMatchContact(tx, session, parsed.data),
    );
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
