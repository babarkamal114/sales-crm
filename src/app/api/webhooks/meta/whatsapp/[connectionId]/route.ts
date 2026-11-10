import { NextResponse, type NextRequest } from 'next/server';

/** Phase 4 stub — verify Meta signature + enqueue inbound/status (live wiring later). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await context.params;
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (!connectionId || connectionId.length < 8) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const expected = process.env.META_WHATSAPP_VERIFY_TOKEN?.trim();
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await context.params;
  if (!connectionId || connectionId.length < 8) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await request.text();
  return NextResponse.json({ received: true });
}
