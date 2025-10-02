// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Mock "me" endpoint: reads cookie and returns user if token valid.
 * Replace token validation with your real JWT verification.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    // Validate token in production (verify signature, expiration)
    if (token !== "fake-jwt-token-for-demo") {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Return basic user info (no sensitive info)
    return NextResponse.json({
      user: {
        id: "u-1",
        name: "Demo User",
        email: "demo@yourapp.test",
      },
    });
  } catch (err) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
