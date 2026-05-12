import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const publicKey = body.public_key;
    if (!publicKey) {
      return NextResponse.json(
        { message: "public_key is required" },
        { status: 400 },
      );
    }

    const otp = body.otp;
    const reference = body.reference || "";

    if (!otp) {
      return NextResponse.json({ message: "OTP is required" }, { status: 400 });
    }

    if (!reference) {
      return NextResponse.json(
        { message: "Payment reference is required" },
        { status: 400 },
      );
    }

    // Forward request to Laravel with Bearer token
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_LARAVEL_API_URL}/api/v1/checkout/charge/card/submit_otp`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          reference,
          otp,
        }),
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
