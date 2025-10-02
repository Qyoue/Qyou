// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Clears the cookie.
 */
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ message: "Logged out" });

  // Clear cookie by setting maxAge 0
  res.cookies.set({
    name: "token",
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });

  return res;
}
