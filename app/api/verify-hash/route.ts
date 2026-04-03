// app/api/verify-hash/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");

  if (!ref) {
    return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  }

  // Extract pk from Authorization header (Bearer token)
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization" },
      { status: 401 },
    );
  }

  const pk = authHeader.split(" ")[1];

  try {
    const laravelUrl = `${process.env.LARAVEL_API_URL}/api/v1/checkout/verify/hash/${encodeURIComponent(ref)}`;

    const response = await fetch(laravelUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${pk}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "(no body)");
      console.warn(`Laravel verify failed: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: "Verification failed" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[/api/verify-hash] Proxy error:", err.message);
    return NextResponse.json(
      { error: "Internal proxy error" },
      { status: 500 },
    );
  }
}
