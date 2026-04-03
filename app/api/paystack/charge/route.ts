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

    const amount = body.amount;
    const customer_email = body.customer_email || "";
    const number = body.number || "";
    const cvv = body.cvv || "";
    const expiry_month = body.expiry_month || "";
    const expiry_year = body.expiry_year || "";

    // Check if amount, currency and email are valid
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Amount must be greater than 0." },
        { status: 400 },
      );
    }

    if (customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
      return NextResponse.json(
        { message: "Invalid email format." },
        { status: 400 },
      );
    }

    if (number && number.length > 19) {
      return NextResponse.json(
        { message: "Card number is too long. Maximum is 19 characters." },
        { status: 400 },
      );
    }

    if (cvv && cvv.length > 4) {
      return NextResponse.json(
        { message: "CVV is too long. Maximum is 4 characters." },
        { status: 400 },
      );
    }

    if (
      expiry_month &&
      (parseInt(expiry_month) < 1 || parseInt(expiry_month) > 12)
    ) {
      return NextResponse.json(
        { message: "Invalid expiry month." },
        { status: 400 },
      );
    }

    if (
      expiry_year &&
      (parseInt(expiry_year) < new Date().getFullYear() ||
        parseInt(expiry_year) > new Date().getFullYear() + 20)
    ) {
      return NextResponse.json(
        { message: "Invalid expiry year." },
        { status: 400 },
      );
    }

    // Forward request to Laravel with Bearer token
    const response = await fetch(
      `${process.env.LARAVEL_API_URL}/api/v1/checkout/charge/card`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          amount: amount,
          customer_email,
          number,
          cvv,
          expiry_month,
          expiry_year,
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
