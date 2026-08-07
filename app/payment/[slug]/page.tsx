"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

declare global {
  interface Window {
    Durapayment: {
      checkout: (config: {
        public_key: string;
        amount: number;
        customer_email: string;
        customer_firstname: string;
        customer_lastname: string;
        customer_phone: string;
        currency: string;
        redirect_url?: string;
        meta?: Record<string, unknown>;
      }) => void;
    };
  }
}

interface LinkData {
  title: string;
  description: string | null;
  images: string[];
  amount: number;
  currency: string;
  business_name: string | null;
  business_logo: string | null;
  public_key: string | null;
  payment_link_id: string;
}

export default function PaymentLinkPage() {
  const { slug } = useParams<{ slug: string }>();

  const [link, setLink] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/payment-links/${slug}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? "Payment link not found");
        setLink(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Payment link not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const handlePay = () => {
    if (!link?.public_key) {
      setError("This merchant hasn't configured payments yet.");
      return;
    }
    if (!email || !firstName || !lastName || !phone) {
      setError("Please fill in all your details before paying.");
      return;
    }

    setSubmitting(true);
    setError(null);

    window.Durapayment.checkout({
      public_key: link.public_key,
      amount: link.amount,
      customer_email: email,
      customer_firstname: firstName,
      customer_lastname: lastName,
      customer_phone: phone,
      currency: link.currency,
      meta: { payment_link_id: link.payment_link_id },
    });

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !link) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[16px] font-semibold text-gray-900">{error}</p>
          <p className="text-[13px] text-gray-400 mt-1">
            This link may have expired or already been used.
          </p>
        </div>
      </div>
    );
  }

  if (!link) return null;

  return (
    <>
      <script src="https://checkout.durapayment.com/durapayment.js" async />

      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {link.images.length > 0 && (
            <img
              src={link.images[0]}
              alt={link.title}
              className="w-full h-48 object-cover"
            />
          )}

          <div className="p-6">
            {link.business_name && (
              <p className="text-[12px] text-gray-400 mb-1">
                {link.business_name}
              </p>
            )}
            <h1 className="text-[20px] font-bold text-gray-900">
              {link.title}
            </h1>
            {link.description && (
              <p className="text-[13px] text-gray-500 mt-2">
                {link.description}
              </p>
            )}

            <p className="text-[28px] font-bold text-gray-900 mt-5">
              {link.currency === "NGN" ? "₦" : link.currency + " "}
              {link.amount.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
              })}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-gray-400"
              />
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-gray-400"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-gray-400"
                />
              </div>
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-gray-400"
              />
            </div>

            {error && <p className="text-[13px] text-red-500 mt-3">{error}</p>}

            <button
              onClick={handlePay}
              disabled={submitting}
              className="w-full mt-5 py-3 rounded-xl bg-gray-900 text-white font-semibold text-[14px] hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {submitting ? "Processing…" : "Pay Now"}
            </button>

            <p className="text-[11px] text-gray-300 text-center mt-4">
              Secured by DuraPayment
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
