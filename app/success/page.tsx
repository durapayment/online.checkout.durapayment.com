"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { formatNaira } from "@/helpers/formatAmount";
import { IoMdCheckmarkCircle, IoMdLock } from "react-icons/io";
import { siteConfig } from "@/config/site";
import { format } from "date-fns";

interface PaymentData {
  checkout_details?: {
    amount?: number;
    customer_email?: string;
    business_name?: string;
    business_logo?: string;
  };
  reference?: string;
  amount?: number;
}

const SuccessScreens = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Option 1: Try to read from URL params (most reliable for fallback redirect)
    const ref = searchParams.get("ref");

    if (ref) {
      const decodeRef = atob(ref);
      const parts = decodeRef.split("||");
      const reference = parts[0];
      const pk = parts[1];
      // Re-fetch minimal data using the same resolve endpoint
      fetchData(pk, reference);
    } else {
      // Option 2: Fallback — try localStorage (if you saved it earlier)
      try {
        const savedData = localStorage.getItem("lastPaymentData");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setData(parsed);
          setIsLoading(false);
        } else {
          setError("No payment information found.");
          setIsLoading(false);
        }
      } catch (e) {
        setError("Unable to load payment details.");
        setIsLoading(false);
      }
    }
  }, [searchParams]);

  const fetchData = async (dent: string, reference: string) => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ key: dent, ref: reference }),
      });

      const json = await res.json();

      if (json.status === 200 && json.data) {
        setData(json.data);
        localStorage.setItem("lastPaymentData", JSON.stringify(json.data));
      } else {
        setError(json.message || "Could not load payment details.");
      }
    } catch (err) {
      setError("Network error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history?.length > 2) {
      window.history.go(-2);
    } else {
      router.push("/");
    }
  };

  const transactionDate = format(new Date(), "MMM dd, yyyy • h:mm a");

  return (
    <div className="bg-white sm:bg-[#fafafa] min-h-screen flex flex-col items-center pt-0 sm:pt-16 pb-10">
      <div className="max-w-full sm:max-w-[490px] w-full px-5 sm:px-0">
        <div className="bg-white sm:border sm:border-gray-200 rounded-lg overflow-hidden shadow-sm">
          {/* Header / Branding */}
          <div className="p-6 border-b border-gray-100 text-center">
            <div className="flex justify-center mb-4">
              <img
                src={data?.checkout_details?.business_logo ?? "/logo.png"}
                alt="Business Logo"
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
              />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Payment Successful!
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Thank you for your patronage
            </p>
          </div>

          {/* Success Icon */}
          <div className="flex justify-center py-8">
            <IoMdCheckmarkCircle className="text-green-500 text-8xl" />
          </div>

          {/* Payment Summary */}
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Loading details...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 px-6">
              <p className="text-red-600 font-medium">{error}</p>
              <Button
                onPress={handleGoBack}
                className="mt-6 bg-gray-800 text-white px-8 py-3 rounded-md"
              >
                Return to Home
              </Button>
            </div>
          ) : (
            <div className="px-6 pb-8">
              <div className="bg-gray-50 rounded-lg p-5 mb-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Amount Paid</span>
                    <span className="text-xl font-bold text-primary">
                      {data?.checkout_details?.amount
                        ? formatNaira(data.checkout_details.amount)
                        : data?.amount
                          ? formatNaira(data.amount)
                          : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Date</span>
                    <span className="text-sm text-black">
                      {transactionDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <Button
                  onPress={handleGoBack}
                  // variant="outline"
                  className="w-full border border-gray-300 py-3 rounded-md font-medium"
                >
                  Return to Website
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-8 text-sm text-gray-500">
          <div className=" flex items-center gap-1">
            <IoMdLock className="text-[15px] text-[#030a2f]" />
            <p className="text-[13px] text-[#030a2f] mt-[3px]">
              Secured by{" "}
              <span className=" lowercase font-black ">{siteConfig.name}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SuccessScreen() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading payment details...
        </div>
      }
    >
      <SuccessScreens />
    </Suspense>
  );
}
