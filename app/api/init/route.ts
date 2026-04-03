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
    const currency = body.currency || "NGN";
    const customer_email = body.customer_email || "";
    const redirect_url = body.redirect_url || "";
    const customer_firstname = body.customer_firstname || "";
    const customer_lastname = body.customer_lastname || "";
    const customer_phone = body.customer_phone || "";

    // Check if amount, currency and email are valid
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { message: "Invalid amount. Amount must be greater than 0." },
        { status: 400 },
      );
    }

    if (!currency) {
      return NextResponse.json(
        { message: "Currency is required." },
        { status: 400 },
      );
    }

    if (customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
      return NextResponse.json(
        { message: "Invalid email format." },
        { status: 400 },
      );
    }

    if (customer_firstname && customer_firstname.length > 100) {
      return NextResponse.json(
        { message: "Customer name is too long. Maximum is 100 characters." },
        { status: 400 },
      );
    }

    if (customer_lastname && customer_lastname.length > 100) {
      return NextResponse.json(
        { message: "Customer name is too long. Maximum is 100 characters." },
        { status: 400 },
      );
    }

    if (customer_phone && !/^0\d{10}$/.test(customer_phone)) {
      return NextResponse.json(
        { message: "Invalid Nigerian phone number." },
        { status: 400 },
      );
    }

    // Forward request to Laravel with Bearer token
    const response = await fetch(
      `${process.env.LARAVEL_API_URL}/api/v1/checkout/init`,
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
          currency: currency,
          customer_email: customer_email,
          redirect_url: redirect_url,
          customer_firstname: customer_firstname,
          customer_lastname: customer_lastname,
          customer_phone: customer_phone,
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
