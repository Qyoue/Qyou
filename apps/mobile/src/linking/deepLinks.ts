/**
 * Deep link and universal link parsing (#1352).
 *
 * Accepts only `qyou://` links and https links on the configured universal-link host,
 * and maps them onto a closed set of in-app routes. Anything else is rejected, so a
 * crafted link can never navigate to an arbitrary destination or carry unexpected params.
 */
export const APP_SCHEME = 'qyou';
/** Host serving the apple-app-site-association and assetlinks files (placeholder; see docs/mobile-deep-links.md). */
export const UNIVERSAL_LINK_HOST = 'links.qyou.example';

export type DeepLinkRoute =
  | { name: 'wallet' }
  | { name: 'rewards' }
  | { name: 'queue'; queueId: string };

const QUEUE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function parseDeepLink(url: string, host: string = UNIVERSAL_LINK_HOST): DeepLinkRoute | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  let segments: string[];
  if (parsed.protocol === `${APP_SCHEME}:`) {
    // qyou://wallet  (hostname = first segment)  or  qyou:///wallet
    segments = [parsed.hostname, ...parsed.pathname.split('/')].filter(Boolean);
  } else if (parsed.protocol === 'https:' && parsed.hostname === host && !parsed.username && !parsed.password) {
    segments = parsed.pathname.split('/').filter(Boolean);
  } else {
    return null;
  }

  const [first, second, ...rest] = segments;
  if (rest.length > 0) return null;
  if (first === 'wallet' && second === undefined) return { name: 'wallet' };
  if (first === 'rewards' && second === undefined) return { name: 'rewards' };
  if (first === 'queue' && second !== undefined && QUEUE_ID.test(second)) {
    return { name: 'queue', queueId: second };
  }
  return null;
}
