// components/AuthGate.tsx
"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/useAuthStore";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setUser(data.user ?? null);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed", err);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // while the initial auth check runs, we show children (you can show a spinner if you want)
  return <>{children}</>;
}
