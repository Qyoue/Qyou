"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionExpiryRedirect } from "@/lib/session";

interface Props {
  children: React.ReactNode;
}

/**
 * Client wrapper that mounts session-expiry redirect handling for every
 * admin route. Server layout (apps/admin-web/src/app/admin/layout.tsx)
 * renders this so auth logic lives in one place.
 */
export default function AdminLayoutClient({ children }: Props) {
  useSessionExpiryRedirect();

  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Verify the session cookie is still present on the client side.
    // The middleware already validates the JWT; this is a lightweight
    // guard against a cleared cookie without a full page reload.
    const hasCookie = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith("admin_token="));

    if (!hasCookie) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div role="status" aria-live="polite" style={{ padding: 32 }}>
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
