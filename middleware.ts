// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/payment/")) {
    return NextResponse.next();
  }

  const refParam = searchParams.get("ref");

  if (!refParam) {
    const redirectUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(redirectUrl);
  }

  // ── Never let a malformed ref crash the whole middleware ──────────
  try {
    const decodeRef = atob(refParam);
    const parts = decodeRef.split("||");
    const reference = parts[0];
    const pk = parts[1];
  } catch (e) {
    console.error("Middleware: failed to decode ref param", e);
    const redirectUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\..*).*)",
  ],
};
