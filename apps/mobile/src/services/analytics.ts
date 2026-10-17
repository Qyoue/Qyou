export function trackEvent(name: string, data?: Record<string, unknown>): void {
  console.log("Track event:", name, data);
}
