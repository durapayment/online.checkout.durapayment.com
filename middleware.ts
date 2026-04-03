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
    pathname.includes(".") || // .png, .ico, .js, etc.
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  // ────────────────────────────────────────────────
  //   Protect ALL app/ routes — require ref + dent
  // ────────────────────────────────────────────────
  const hasRef: any = searchParams.has("ref");

  // If missing either parameter → redirect to a safe place
  if (!hasRef) {
    // Option A: redirect back to your merchant site / home
    // (replace with your real merchant / landing URL)
    const redirectUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Option B: show a friendly "invalid session" page (recommended)
    // return NextResponse.redirect(new URL('/invalid-session', request.url));

    // Option C: just go home
    return NextResponse.redirect(redirectUrl);
  }

  const ref = searchParams.get("ref");

  const decodeRef = atob(hasRef);
  const parts = decodeRef.split("||");
  const reference = parts[0];
  const pk = parts[1];

  // All good → continue to the page
  return NextResponse.next();
}

// Apply middleware to **all pages** except the ones you explicitly excluded above
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api routes
     * - /_next (Next.js internals)
     * - /static (static files)
     * - /favicon.ico, /robots.txt, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\..*).*)",
    // Or more strict — only protect checkout-related pages:
    // '/','/success','/cancel'
  ],
};
