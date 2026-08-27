/**
 * Warns in the browser console when NEXT_PUBLIC_API_URL is still the
 * default localhost fallback in a production build.
 */
export function checkApiUrl(): void {
  if (process.env.NODE_ENV === 'production') {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      console.warn(
        '[Qyou] NEXT_PUBLIC_API_URL is set to a localhost address in production. ' +
        'Set the production API URL in your deployment environment variables.',
      );
    }
  }
}
