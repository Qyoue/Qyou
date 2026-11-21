import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getApiConnectSrc(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return "'self'";
  try {
    const url = new URL(raw);
    return `'self' ${url.origin}`;
  } catch {
    return "'self'";
  }
}

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const connectSrc = getApiConnectSrc();
  const cspReportOnly = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `connect-src ${connectSrc}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy-Report-Only', cspReportOnly);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy-Report-Only', cspReportOnly);
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
