import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const key = body.key;
    const ref = body.ref;

    // Check if amount, currency and email are valid
    if (!key) {
      return NextResponse.json(
        { message: "Some data are required." },
        { status: 400 },
      );
    }

    // Check if ref is provided
    if (!ref) {
      return NextResponse.json(
        { message: "Payment reference is required." },
        { status: 400 },
      );
    }

    // Forward request to Laravel with Bearer token
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_LARAVEL_API_URL}/api/v1/checkout/resolve/${ref}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
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
    console.log(error);
    return NextResponse.json(
      { status: 500, message: "Internal server error" },
      { status: 500 },
    );
  }
}
