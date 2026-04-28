"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SESSION_EXPIRY_EVENT = "admin:session-expired";

export function emitSessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRY_EVENT));
  }
}

/**
 * Hook: listens for session-expiry events and redirects to /login.
 * Mount once in a client layout that wraps all admin pages.
 */
export function useSessionExpiryRedirect() {
  const router = useRouter();

  useEffect(() => {
    const handler = () => router.replace("/login");
    window.addEventListener(SESSION_EXPIRY_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRY_EVENT, handler);
  }, [router]);
}

/**
 * Wraps fetch; on 401 it emits the session-expiry event so the
 * useSessionExpiryRedirect hook can redirect without coupling
 * every call-site to the router.
 */
export async function adminFetch(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    emitSessionExpired();
  }
  return res;
}
