// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ────────────────────────────────────────────────
  //   Allow public assets, api routes, next internals
  // ────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────
  //   Payment links use a path-based slug, not the ref/pk
  //   query-string scheme below — always public, no gate. ──
  // ────────────────────────────────────────────────
  if (pathname.startsWith("/payment/")) {
    return NextResponse.next();
  }

  // ────────────────────────────────────────────────
  //   Protect ALL app/ routes — require ref + dent
  // ────────────────────────────────────────────────
  const refParam = searchParams.get("ref");

  if (!refParam) {
    const redirectUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(redirectUrl);
  }

  const decodeRef = atob(refParam);
  const parts = decodeRef.split("||");
  const reference = parts[0];
  const pk = parts[1];

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\..*).*)",
  ],
};
