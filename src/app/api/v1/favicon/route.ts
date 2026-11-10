import { NextResponse, type NextRequest } from 'next/server';
import { normaliseDomain } from '@/domain/companies/normalise-domain';

const CACHE = new Map<string, { body: ArrayBuffer; contentType: string; at: number }>();
const TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const domain = normaliseDomain(request.nextUrl.searchParams.get('domain'));
  if (!domain) {
    return new NextResponse(null, { status: 400 });
  }

  const cached = CACHE.get(domain);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return new NextResponse(cached.body, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const upstream = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`, {
      signal: controller.signal,
    });
    if (!upstream.ok) {
      return new NextResponse(null, { status: 404 });
    }
    const body = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') ?? 'image/png';
    CACHE.set(domain, { body, contentType, at: Date.now() });
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  } finally {
    clearTimeout(timer);
  }
}
