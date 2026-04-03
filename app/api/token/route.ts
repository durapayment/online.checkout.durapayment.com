// app/api/verify/token/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    console.log("This is token:", token);

    if (!token) {
      return NextResponse.json(
        { message: "Payment token is required" },
        { status: 400 },
      );
    }

    const laravelUrl = `${process.env.LARAVEL_API_URL}/api/v1/checkout/verify/token/${encodeURIComponent(token)}`;

    const response = await fetch(laravelUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();
    // console.log(data);

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Verify token proxy error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
