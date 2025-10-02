// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Mock login
 * Accepts { email, password } and sets an HttpOnly cookie "token" when credentials are valid.
 * Replace this with your real auth logic / JWT generation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Simple mock check (replace with real validation)
    if (!email || !password) {
      return NextResponse.json(
        { message: "Missing credentials" },
        { status: 400 }
      );
    }
    // In real: verify password, create JWT
    // For demo we accept any credentials and issue a fake token
    const token = "fake-jwt-token-for-demo"; // in production: a real JWT

    const response = NextResponse.json({
      message: "Logged in",
      user: {
        id: "u-1",
        name: "Demo User",
        email,
      },
    });

    // Set HttpOnly cookie
    // NOTE: In production set secure=true, sameSite, path=/, and proper maxAge and domain as needed
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      // secure: true, // enable in production (HTTPS)
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      // sameSite: "strict",
    });

    return response;
  } catch (err) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
