export function getSafeNextPath(nextParam: string | null | undefined, fallback = '/queue'): string {
  if (!nextParam) return fallback;
  // Only allow same-origin absolute paths, reject protocol-relative and external URLs.
  if (!nextParam.startsWith('/') || nextParam.startsWith('//')) return fallback;
  if (nextParam.includes('\\')) return fallback;
  try {
    const url = new URL(nextParam, 'https://qyou.local');
    if (url.origin !== 'https://qyou.local') return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
