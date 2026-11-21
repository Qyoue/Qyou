import { useEffect, useState } from 'react';

/** Subscribes to connectivity changes; returns an unsubscribe function. */
export type ConnectivitySubscribe = (onChange: (online: boolean) => void) => () => void;

/**
 * Default source: the browser-style `online`/`offline` events (Expo web, and
 * runtimes that provide them). On platforms without them it assumes online.
 * Pass a NetInfo-backed `subscribe` on native once that dependency is added.
 */
export const defaultSubscribe: ConnectivitySubscribe = (onChange) => {
  const g = globalThis as unknown as {
    addEventListener?: (type: string, fn: () => void) => void;
    removeEventListener?: (type: string, fn: () => void) => void;
    navigator?: { onLine?: boolean };
  };
  if (!g.addEventListener || !g.removeEventListener) return () => undefined;
  const up = () => onChange(true);
  const down = () => onChange(false);
  g.addEventListener('online', up);
  g.addEventListener('offline', down);
  if (g.navigator && typeof g.navigator.onLine === 'boolean') onChange(g.navigator.onLine);
  return () => {
    g.removeEventListener?.('online', up);
    g.removeEventListener?.('offline', down);
  };
};

export function useNetworkConnectivity(subscribe: ConnectivitySubscribe = defaultSubscribe): boolean {
  const [isConnected, setIsConnected] = useState(true);
  useEffect(() => subscribe(setIsConnected), [subscribe]);
  return isConnected;
}
