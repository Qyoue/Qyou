import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, QueueSnapshot } from "@qyou/types";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.ADMIN_AUTH_COOKIE || "admin_token")?.value ?? "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  if (!apiBase || !token) {
    return NextResponse.json({ success: false, error: { code: "AUTH_ERROR", message: "Not authenticated" } }, { status: 401 });
  }

  const locationId = req.nextUrl.searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "locationId is required" } }, { status: 400 });
  }

  try {
    const res = await fetch(`${apiBase}/queues/${encodeURIComponent(locationId)}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: { code: "UPSTREAM_ERROR", message: `Upstream returned ${res.status}` } },
        { status: res.status }
      );
    }

    const payload = (await res.json()) as ApiResponse<{ snapshot: QueueSnapshot }>;
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch queue snapshot" } },
      { status: 500 }
    );
  }
}
