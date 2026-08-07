export default function PaymentLinkFallbackPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-gray-400"
          >
            <path
              d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l4-4a4 4 0 015.656 5.656l-1.5 1.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-[18px] font-bold text-gray-900">
          No payment link specified
        </h1>
        <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">
          This page needs a specific payment link to work. Check the link you
          were given — it should look something like{" "}
          <span className="font-mono text-gray-700">
            checkout.durapayment.com/payment/xxxxxxxx
          </span>
          .
        </p>

        <p className="text-[12px] text-gray-300 mt-6">Secured by DuraPayment</p>
      </div>
    </div>
  );
}
