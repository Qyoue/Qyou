import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, QueueReport } from "@qyou/types";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.ADMIN_AUTH_COOKIE || "admin_token")?.value ?? "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  if (!apiBase || !token) {
    return NextResponse.json({ success: false, error: { code: "AUTH_ERROR", message: "Not authenticated" } }, { status: 401 });
  }

  const locationId = req.nextUrl.searchParams.get("locationId");
  const url = locationId
    ? `${apiBase}/admin/queue-reports?locationId=${encodeURIComponent(locationId)}`
    : `${apiBase}/admin/queue-reports`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: { code: "UPSTREAM_ERROR", message: `Upstream returned ${res.status}` } },
        { status: res.status }
      );
    }

    const payload = (await res.json()) as ApiResponse<{ reports: QueueReport[] }>;
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch queue reports" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.ADMIN_AUTH_COOKIE || "admin_token")?.value ?? "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  if (!apiBase || !token) {
    return NextResponse.json({ success: false, error: { code: "AUTH_ERROR", message: "Not authenticated" } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } }, { status: 400 });
  }

  try {
    const res = await fetch(`${apiBase}/queues/report`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: { code: "UPSTREAM_ERROR", message: `Upstream returned ${res.status}` } },
        { status: res.status }
      );
    }

    const payload = (await res.json()) as ApiResponse<QueueReport>;
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to submit queue report" } },
      { status: 500 }
    );
  }
}
