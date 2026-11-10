import { NextResponse, type NextRequest } from 'next/server';

/** Phase 1 stub: verify + enqueue in Phase 2/3. Unknown connection → 404. */
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
