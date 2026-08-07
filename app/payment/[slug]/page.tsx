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
  redirect_url: string | null;
  payment_link_id: string;
}

// ─────────────────────────────────────────────────────────
// Image Carousel — main image + prev/next arrows + thumbnail
// strip + dot indicators. Falls back to a plain placeholder
// when there are no images at all.
// ─────────────────────────────────────────────────────────
function ImageCarousel({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full h-full min-h-[280px] min-w-0 bg-gray-100 flex items-center justify-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          className="text-gray-300"
        >
          <path
            d="M4 6h16v12H4V6zm2 2v8h12V8H6zm2 6l2.5-3 1.5 2 2-2.5L18 16H8z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  const next = () => setIndex((i) => (i + 1) % images.length);
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <div className="relative w-full h-full min-h-[280px] min-w-0 overflow-hidden bg-gray-900 group">
      <img
        src={images[index]}
        alt={title}
        className="w-full h-full max-w-full object-cover"
      />

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="#111"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 18l6-6-6-6"
                stroke="#111"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* dot indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === index ? "bg-white w-4" : "bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* thumbnail strip */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            <span className="px-2 py-1 rounded-full bg-black/50 text-white text-[11px] font-medium">
              {index + 1} / {images.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
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
      redirect_url: link.redirect_url || undefined,
      currency: link.currency,
      meta: { payment_link_id: link.payment_link_id },
    });

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !link) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
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

      <div className="min-h-screen w-full overflow-x-hidden bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="max-w-5xl w-full min-w-0 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="grid md:grid-cols-2">
            {/* ── Left: image carousel ─────────────────────────── */}
            <div className="relative min-w-0">
              <ImageCarousel images={link.images} title={link.title} />
            </div>

            {/* ── Right: details + form ────────────────────────── */}
            <div className="p-8 md:p-10 flex flex-col min-w-0">
              {link.business_name && (
                <div className="flex items-center gap-2 mb-4">
                  {link.business_logo && (
                    <img
                      src={link.business_logo}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  )}
                  <p className="text-[13px] text-gray-500 font-medium">
                    {link.business_name}
                  </p>
                </div>
              )}

              <h1 className="text-[24px] font-bold text-gray-900 leading-tight">
                {link.title}
              </h1>
              {link.description && (
                <p className="text-[14px] text-gray-500 mt-2 leading-relaxed">
                  {link.description}
                </p>
              )}

              <div className="flex items-baseline gap-2 mt-6 pb-6 border-b border-gray-100">
                <p className="text-[34px] font-bold text-gray-900">
                  {link.currency === "NGN" ? "₦" : link.currency + " "}
                  {link.amount.toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <p className="text-[13px] font-semibold text-gray-700 mt-6 mb-3">
                Your details
              </p>

              <div className="flex flex-col gap-3">
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
                    className="flex-1 min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="flex-1 min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-gray-400"
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

              {error && (
                <p className="text-[13px] text-red-500 mt-3">{error}</p>
              )}

              <button
                onClick={handlePay}
                disabled={submitting}
                className="w-full mt-6 py-3.5 rounded-xl bg-gray-900 text-white font-semibold text-[15px] hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {submitting
                  ? "Processing…"
                  : `Pay ${link.currency === "NGN" ? "₦" : link.currency + " "}${link.amount.toLocaleString("en-NG")}`}
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-5">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-gray-300"
                >
                  <path
                    d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                <p className="text-[11px] text-gray-400">
                  Secured by DuraPayment
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
