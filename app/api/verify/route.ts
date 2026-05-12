import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reference = body.reference;
    const dent = body.dent;

    // Check if amount, currency and email are valid
    if (!reference) {
      return NextResponse.json(
        { message: "Reference is required." },
        { status: 400 },
      );
    }

    // Check if dent is valid
    if (!dent) {
      return NextResponse.json(
        { message: "dent is required." },
        { status: 400 },
      );
    }

    // Forward request to Laravel with Bearer token
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_LARAVEL_API_URL}/api/v1/checkout/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${dent}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: 500, message: "Internal server error" },
      { status: 500 },
    );
  }
}
