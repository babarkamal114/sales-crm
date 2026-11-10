import { NextResponse, type NextRequest } from 'next/server';
import { createTagSchema } from '@/domain/contacts/mutation-schemas';
import { getActiveSession } from '@/server/auth/require-session';
import { ForbiddenError } from '@/server/access/capabilities';
import { withTenant } from '@/server/db/with-tenant';
import { createContactTag, listContactTags } from '@/server/services/contacts/contact-tags';

export async function GET() {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const items = await withTenant(session, (tx) => listContactTags(tx, session));
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

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

  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }

  try {
    const result = await withTenant(session, (tx) => createContactTag(tx, session, parsed.data));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
