import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const authCookieName = process.env.ADMIN_AUTH_COOKIE || "admin_token";
  const token = cookieStore.get(authCookieName)?.value || "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

  if (!apiBase || !token) {
    return NextResponse.json(
      { success: false, error: { code: "ADMIN_AUTH_REQUIRED", message: "Admin authentication is required." } },
      { status: 401 }
    );
  }

  const payload = await request.json();
  const response = await fetch(`${apiBase}/admin/locations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
