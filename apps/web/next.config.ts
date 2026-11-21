import type { NextConfig } from 'next';

function getApiConnectSrc(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return "'self'";
  try {
    return `'self' ${new URL(raw).origin}`;
  } catch {
    return "'self'";
  }
}

const nextConfig: NextConfig = {
  async headers() {
    const connectSrc = getApiConnectSrc();
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src ${connectSrc}; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`,
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
