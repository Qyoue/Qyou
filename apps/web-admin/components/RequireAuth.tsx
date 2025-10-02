// components/RequireAuth.tsx
"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/useAuthStore";

export default function RequireAuth({
  children,
  fallbackPath = "/login",
}: {
  children: React.ReactNode;
  fallbackPath?: string;
}) {
  const { isAuthenticated, loading } = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    loading: s.loading,
  }));

  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(fallbackPath);
    }
  }, [isAuthenticated, loading, router, fallbackPath]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-center">
          Checking authentication...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // while redirecting, show nothing or a simple message
    return null;
  }

  return <>{children}</>;
}
