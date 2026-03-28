import { decodeJwt, SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = process.env.ADMIN_AUTH_COOKIE || "admin_token";

const createAdminToken = async (params: { userId: string; email: string }) => {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET is not configured");
  }

  const key = new TextEncoder().encode(secret);
  return new SignJWT({
    sub: params.userId,
    email: params.email,
    role: "ADMIN",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key);
};

export async function POST(request: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  if (!apiBase) {
    return NextResponse.json(
      { success: false, error: { code: "ADMIN_API_MISSING", message: "NEXT_PUBLIC_API_URL is not configured." } },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { email?: string; password?: string };
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  const loginResponse = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const loginPayload = (await loginResponse.json()) as {
    success?: boolean;
    data?: { accessToken?: string };
    error?: { message?: string };
  };

  if (!loginResponse.ok || !loginPayload.success || !loginPayload.data?.accessToken) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_LOGIN_FAILED",
          message: loginPayload.error?.message || "Unable to authenticate with the API.",
        },
      },
      { status: loginResponse.status || 401 }
    );
  }

  const accessPayload = decodeJwt(loginPayload.data.accessToken);
  const role = typeof accessPayload.role === "string" ? accessPayload.role : "";
  const userId = typeof accessPayload.sub === "string" ? accessPayload.sub : "";

  if (role !== "ADMIN" || !userId) {
    return NextResponse.json(
      { success: false, error: { code: "ADMIN_ROLE_REQUIRED", message: "Admin access is required." } },
      { status: 403 }
    );
  }

  const token = await createAdminToken({
    userId,
    email,
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
