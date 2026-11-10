import { NextResponse, type NextRequest } from 'next/server';
import type { MessageChannel } from '@/domain/conversations/types';
import { getActiveSession } from '@/server/auth/require-session';
import { NotFoundError, ForbiddenError } from '@/server/access/capabilities';
import { withTenant } from '@/server/db/with-tenant';
import { ensureConversationForContact } from '@/server/services/conversations/ensure-conversation-for-contact';

const CHANNELS = new Set<MessageChannel>(['email', 'sms', 'whatsapp']);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contactId: string }> },
) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { contactId } = await context.params;
  const channelParam = request.nextUrl.searchParams.get('channel');
  const channel =
    channelParam && CHANNELS.has(channelParam as MessageChannel)
      ? (channelParam as MessageChannel)
      : null;

  try {
    const result = await withTenant(session, (tx) =>
      ensureConversationForContact(tx, session, contactId),
    );

    const search = new URLSearchParams({ c: result.conversationId });
    if (channel) search.set('channel', channel);

    return NextResponse.json(
      {
        conversationId: result.conversationId,
        contactId: result.contactId,
        created: result.created,
        href: `/conversations?${search.toString()}`,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
