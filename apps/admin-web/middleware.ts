import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, JWTPayload } from "jose";

const DEFAULT_AUTH_COOKIE = "admin_token";

const toUnauthorizedResponse = (request: NextRequest, cookieName: string) => {
  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);

  response.cookies.set({
    name: cookieName,
    value: "",
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
  });

  return response;
};

const getRole = (payload: JWTPayload): string => {
  const role = payload.role;
  if (typeof role === "string") {
    return role;
  }
  return "";
};

export async function middleware(request: NextRequest) {
  const authCookieName = process.env.ADMIN_AUTH_COOKIE || DEFAULT_AUTH_COOKIE;
  const token = request.cookies.get(authCookieName)?.value;

  if (!token) {
    return toUnauthorizedResponse(request, authCookieName);
  }

  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    return toUnauthorizedResponse(request, authCookieName);
  }

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    const role = getRole(payload);

    if (role !== "ADMIN") {
      return toUnauthorizedResponse(request, authCookieName);
    }

    return NextResponse.next();
  } catch {
    return toUnauthorizedResponse(request, authCookieName);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
