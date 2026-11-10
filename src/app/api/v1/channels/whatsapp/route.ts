import { NextResponse } from 'next/server';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { getWhatsAppChannelDetail } from '@/server/services/channels/managed-whatsapp';

export async function GET() {
  try {
    const session = await requireSession();
    const detail = await withTenant(session, (tx) => getWhatsAppChannelDetail(tx, session));
    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
