"use client";
import { useEffect, useState, useMemo, Suspense } from "react";
import { Button } from "@heroui/button";
import { formatNaira } from "@/helpers/formatAmount";
import { PiCreditCard, PiBank, PiCreditCardBold } from "react-icons/pi";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import { TbArrowsExchange, TbTransfer } from "react-icons/tb";
import { IoCard } from "react-icons/io5";
import { IoMdClose, IoMdLock } from "react-icons/io";
import { siteConfig } from "@/config/site";
import { PiCopySimple } from "react-icons/pi";
import { copyToClipboard } from "@/helpers/copytext";

type ChargeStep = "card" | "pin" | "otp" | "success" | "failed";

const InnerCheckout = () => {
  const searchParams = useSearchParams();
  const [selectedMethod, setSelectedMethod] = useState<"card" | "transfer">(
    "transfer",
  );
  const [currenctPage, setCurrentPage] = useState("transfer");

  // ── Card states ──────────────────────────────────
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");

  const [chargeReference, setChargeReference] = useState<string | null>(null);
  const [chargeStep, setChargeStep] = useState<ChargeStep>("card");
  const [chargeMessage, setChargeMessage] = useState("");
  const [chargeError, setChargeError] = useState<string | null>(null);

  // ── General states ─────────────────────────────────────
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transfer states
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<
    "idle" | "success" | "failed"
  >("idle");
  const [verifyMessage, setVerifyMessage] = useState("");

  useEffect(() => {
    resolvePaymentReference();
  }, []);

  useEffect(() => {
    if (selectedMethod !== "transfer" || timeLeft <= 0) return;
    const timer = setInterval(
      () => setTimeLeft((p) => (p <= 1 ? 0 : p - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [selectedMethod, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const resolvePaymentReference = async () => {
    try {
      const ref = searchParams.get("ref");
      if (!ref) throw new Error("Missing payment reference");

      const decoded = atob(ref);
      const [reference, pk] = decoded.split("||");

      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: pk, ref: reference }),
      });

      const json = await res.json();

      if (json.status === 200 && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.message || "Failed to load payment details");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setTimeout(() => window.history.back(), 2800);
    } finally {
      setIsLoading(false);
    }
  };

  // ── CARD PAYMENT FLOW ────────────────────────────────────────────
  const handleChargeStart = async () => {
    if (!data) return;
    setIsProcessing(true);
    setChargeError(null);
    setChargeMessage("");

    const ref = searchParams.get("ref");
    const decoded = atob(ref!);
    const [, pk] = decoded.split("||");

    try {
      const email = data.checkout_details?.customer_email;
      const amount = data.checkout_details?.amount;

      const payload = {
        customer_email: email,
        amount: amount,
        number: cardNumber.replace(/\s/g, ""),
        cvv,
        expiry_month: expiry.split("/")[0]?.trim(),
        expiry_year: "20" + expiry.split("/")[1]?.trim(),
        public_key: pk,
      };

      const res = await fetch("/api/paystack/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!json.status || !json.data) {
        throw new Error(json.message || "Charge initiation failed");
      }

      const { reference, status } = json.data.gateway_response;

      setChargeReference(reference);
      if (status === "send_pin") {
        setChargeStep("pin");
        setChargeMessage("Please enter your card PIN");
      } else if (status === "send_otp") {
        setChargeStep("otp");
        setChargeMessage(
          json.data.display_text || "Enter the OTP sent to your phone/email",
        );
      } else if (status === "success") {
        setChargeStep("success");
        handlePaymentSuccess(reference);
      } else {
        throw new Error("Unexpected charge status");
      }
    } catch (err: any) {
      setChargeError(err.message || "Failed to start payment");
      setChargeStep("failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitPin = async () => {
    if (!chargeReference || pin.length !== 4) return;
    setIsProcessing(true);

    const ref = searchParams.get("ref");
    const decoded = atob(ref!);
    const [reference, pk] = decoded.split("||");

    try {
      const res = await fetch("/api/paystack/submit_pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          reference: chargeReference,
          pin,
          public_key: pk,
        }),
      });

      const json = await res.json();

      if (!json.status)
        throw new Error(json.message || "PIN submission failed");

      const { status, display_text } = json.data.gateway_response;

      if (status === "send_otp") {
        setChargeStep("otp");
        setChargeMessage(display_text || "Enter OTP sent to your phone/email");
      } else if (status === "success") {
        setChargeStep("success");
        handlePaymentSuccess(chargeReference);
      } else {
        throw new Error("Unexpected status after PIN");
      }
    } catch (err: any) {
      setChargeError(err.message);
      setChargeStep("failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitOtp = async () => {
    if (!chargeReference || otp.length < 4) return;
    setIsProcessing(true);

    const ref = searchParams.get("ref");
    const decoded = atob(ref!);
    const [reference, pk] = decoded.split("||");

    try {
      const res = await fetch("/api/paystack/submit_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: chargeReference,
          otp: otp,
          public_key: pk,
        }),
      });

      const json = await res.json();

      if (!json.status)
        throw new Error(json.message || "OTP verification failed");

      if (json.data.status === "success") {
        setChargeStep("success");
        handlePaymentSuccess(chargeReference);
      } else {
        throw new Error(json.message || "Payment not approved");
      }
    } catch (err: any) {
      setChargeError(err.message);
      setChargeStep("failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = (reference: string) => {
    const redirectUrl = data.checkout_details?.redirect_url;
    const finalRedirect = redirectUrl
      ? `${redirectUrl}?ref=${reference}`
      : `/success?ref=${searchParams.get("ref")}`;

    setTimeout(() => {
      window.location.href = finalRedirect;
    }, 1800);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/.{1,4}/g);
    return matches ? matches.join(" ") : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/[^0-9]/g, "");
    if (v.length >= 2) return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    return v;
  };

  // Verify Payment for transfer method
  const verifyTransferPayment = async () => {
    console.log("Verifying transfer payment...");
    setVerifyLoading(true);
    setVerifyMessage("");

    const ref = searchParams.get("ref");
    if (!ref) throw new Error("Missing payment reference");

    const decoded = atob(ref);
    const [refs, pk] = decoded.split("||");

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: refs, dent: pk }),
      });

      const json = await res.json();

      if (json.status && json.data.status === "completed") {
        setVerifyStatus("success");
        setVerifyMessage("Payment verified! Redirecting...");
        setTimeout(() => {
          window.location.href =
            `${data.checkout_details?.redirect_url}?ref=${refs}` ||
            `/success?ref=${ref}`;
        }, 2000);
      } else {
        throw new Error(json.message || "Payment not verified yet");
      }
    } catch (err: any) {
      setVerifyStatus("failed");
      setVerifyMessage(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── UI: Card Payment Page ────────────────────────────────────────
  const cardPage = () => {
    if (chargeStep === "success") {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <div className="text-green-600 text-5xl mb-4">✓</div>
          <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">Redirecting you shortly...</p>
          <Spinner size="lg" />
        </div>
      );
    }

    if (chargeStep === "failed") {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <div className="text-red-600 text-5xl mb-4">✗</div>
          <h2 className="text-xl font-bold mb-2">Payment Failed</h2>
          <p className="text-gray-600 break-words mb-6">
            Something went wrong. Try again!
          </p>
          <Button
            onPress={() => {
              setChargeStep("card");
              setChargeError(null);
              setPin("");
              setOtp("");
              setChargeReference(null);
            }}
            className="bg-red-600 text-white px-8 py-3"
          >
            Try Again
          </Button>
        </div>
      );
    }

    return (
      <div className="px-5 flex flex-1 flex-col">
        <p className="text-center text-[#1b1a22] py-[20px] font-medium text-[14px]">
          Pay {formatNaira(data?.checkout_details?.amount || 0)} with your
          credit or debit card
        </p>

        {chargeStep === "card" && (
          <div className="flex flex-1 flex-col justify-between">
            <div className="bg-[#f4f4f4] rounded-lg p-[20px]">
              <div className="flex flex-col gap-[30px]">
                <div>
                  <p className="text-[10px] text-[#2b2b2b] uppercase mb-1">
                    Card Number
                  </p>
                  <input
                    type="text"
                    maxLength={19}
                    value={formatCardNumber(cardNumber)}
                    onChange={(e) =>
                      setCardNumber(formatCardNumber(e.target.value))
                    }
                    placeholder="1234 5678 9012 3456"
                    className="w-full border-[0.5px] rounded-md px-3 text-[14px] py-[8px] tracking-wider"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-[#2b2b2b] uppercase mb-1">
                      Expiry (MM/YY)
                    </p>
                    <input
                      type="text"
                      maxLength={5}
                      value={formatExpiry(expiry)}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      className="w-full border-[0.5px] rounded-md px-3 text-[14px] py-[8px]"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-[#2b2b2b] uppercase mb-1">
                      CVV
                    </p>
                    <input
                      type="password"
                      maxLength={4}
                      value={cvv}
                      onChange={(e) =>
                        setCvv(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="123"
                      className="w-full border-[0.5px] rounded-md px-3 text-[14px] py-[8px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              onPress={handleChargeStart}
              disabled={isProcessing || !cardNumber || !expiry || !cvv}
              className="w-full mb-7 bg-transparent rounded-md cursor-pointer text-[13px] font-[500] text-[#3f3f3f] border-1 border-[#e0e0e0] py-[10px]"
            >
              {isProcessing ? (
                <>
                  <Spinner size="sm" className="mr-3" />
                  Processing...
                </>
              ) : (
                `Pay ${formatNaira(data?.checkout_details?.amount || 0)}`
              )}
            </Button>
          </div>
        )}

        {chargeStep === "pin" && (
          <div className="flex flex-col justify-between flex-1">
            <div>
              <div className="text-center mt-[30px] mb-[20px]">
                <h3 className="text-[18px] font-semibold">Enter Card PIN</h3>
                <p className="text-[13px] text-gray-600">{chargeMessage}</p>
              </div>

              <div className="w-full flex flex-col items-center">
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-[60%] border-b-[0.3px] text-center text-[25px] tracking-[10px] border-gray-400 py-2 focus:outline-none"
                />
              </div>
            </div>

            <Button
              onPress={handleSubmitPin}
              disabled={isProcessing || pin.length !== 4}
              className="w-full mb-7 bg-transparent rounded-md cursor-pointer text-[13px] font-[500] text-[#3f3f3f] border-1 border-[#e0e0e0] py-[10px]"
            >
              {isProcessing ? "Verifying..." : "Continue"}
            </Button>
          </div>
        )}

        {chargeStep === "otp" && (
          <div className="flex flex-col justify-between flex-1">
            <div>
              <div className="text-center mt-[30px] mb-[20px]">
                <h3 className="text-[18px] font-semibold">Enter OTP</h3>
                <p className="text-[13px] text-gray-600">{chargeMessage}</p>
              </div>

              <div className="w-full flex flex-col items-center">
                <input
                  type="text"
                  maxLength={8}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-[70%] border-b-[0.3px] text-center text-[25px] tracking-[12px] border-gray-400 py-2 focus:outline-none"
                />
              </div>
            </div>

            <Button
              onPress={handleSubmitOtp}
              disabled={isProcessing || otp.length < 4}
              className="w-full mb-7 bg-transparent rounded-md cursor-pointer text-[13px] font-[500] text-[#3f3f3f] border-1 border-[#e0e0e0] py-[10px]"
            >
              {isProcessing ? "Verifying..." : "Continue"}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const transferPage = (data: any, time: string) => {
    return (
      <div className="px-[20px] flex-1 flex flex-col">
        <div className="basis-[60%] flex flex-col">
          <p className="text-center text-[#1b1a22] py-[20px] font-medium text-[14px]">
            Transfer {formatNaira(data?.amount)} to {siteConfig.name}
          </p>
          <div className="bg-[#f4f4f4] min-h-[190px] justify-between rounded-lg p-[20px] flex-1 flex flex-col">
            <div className="leading-[20px]">
              <p className="text-[10px] text-[#2b2b2b]">BANK NAME</p>
              <p className="text-[14px] font-medium text-[#393939]">
                {data?.bank_account?.bank_name}
              </p>
            </div>
            <div className="flex items-end justify-between">
              <div className="leading-[20px]">
                <p className="text-[10px] text-[#2b2b2b]">ACCOUNT NUMBER</p>
                <p className="text-[14px] font-medium text-[#393939]">
                  {data?.bank_account?.account_number}
                </p>
              </div>
              <PiCopySimple
                className="text-[14px] cursor-pointer text-[#6e6e6e]"
                onClick={() =>
                  copyToClipboard(data?.bank_account?.account_number)
                }
              />
            </div>
            <div className="flex items-end justify-between">
              <div className="leading-[20px]">
                <p className="text-[10px] text-[#2b2b2b]">AMOUNT</p>
                <p className="text-[14px] font-medium text-[#393939]">
                  {formatNaira(data?.amount)}
                </p>
              </div>
              <PiCopySimple
                className="text-[14px] cursor-pointer text-[#6e6e6e]"
                onClick={() => copyToClipboard(formatNaira(data?.amount))}
              />
            </div>
          </div>
        </div>
        <div className="basis-[40%] flex flex-col items-center">
          <p className="text-[12px] leading-[14px] text-[#545454] p-[15px] pt-[25px]">
            This account is for this transaction only and <br /> expires in{" "}
            <span className="text-primary">{time}</span>
          </p>
          <Button
            disabled={verifyLoading}
            className="w-full bg-transparent mt-[10px] rounded-md cursor-pointer text-[13px] font-[500] text-[#3f3f3f] border-1 border-[#e0e0e0] py-[10px]"
            onPress={verifyTransferPayment}
          >
            {verifyLoading ? (
              <>
                <Spinner size="sm" className="mr-2 inline" />
                Confirming payment...
              </>
            ) : (
              "I've made payment"
            )}
          </Button>
        </div>
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="bg-white sm:bg-[#fafafa] flex flex-col pt-0 sm:pt-[100px] items-center h-[100svh]">
      <div className="max-w-full relative sm:max-w-[490px] rounded-lg sm:border-1 sm:border-gray-200 w-full flex items-center h-[500px]">
        {/* Side menu - desktop */}
        <div className="w-[28%] pt-[10px] rounded-l-lg pl-[10px] hidden sm:block h-[100%] bg-[#14644c]">
          <div className="h-[50px] w-full border-b-1 border-[#e2e2e2] flex items-center justify-start">
            <p className="text-[12px] text-white font-bold">PAY WITH</p>
          </div>
          {["card", "transfer"].map((method) => (
            <div
              key={method}
              onClick={() => setCurrentPage(method)}
              className="h-[45px] cursor-pointer w-full border-b-[0.6px] border-[#e2e2e2] flex items-center justify-start"
            >
              <div className="flex items-center gap-2 pl-2">
                {method === "card" ? (
                  <PiCreditCardBold className="text-white" />
                ) : (
                  <TbTransfer className="text-white" />
                )}
                <p
                  className={`text-[13px] mt-[3px] font-medium ${currenctPage === method ? "text-[#9ca27b]" : "text-white"}`}
                >
                  {method === "card" ? "Card" : "Transfer"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 sm:pt-[10px] rounded-r-lg bg-white h-[100%]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-600">
              {error}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Mobile method indicator */}
              <div className="sm:hidden px-[20px] py-[12px] bg-[#14644c]">
                <div className="flex items-center gap-2">
                  {currenctPage === "card" ? (
                    <IoCard className="text-[19px] text-white" />
                  ) : (
                    <PiBank className="text-[19px] text-white" />
                  )}
                  <p className="text-[15px] mt-[3px] capitalize font-medium text-[#ffffff]">
                    {currenctPage}
                  </p>
                </div>
              </div>

              {/* Header - amount & email */}
              <div className="h-[70px] sm:h-[50px] py-[15px] sm:py-0 px-[20px] pb-[15px] border-b-1 border-[#f3f3f3] flex items-center justify-between">
                <img
                  src={data?.checkout_details?.business_logo ?? "/logo.png"}
                  alt="Merchant"
                  className="w-[30px] h-[30px] rounded-md object-cover"
                />
                <div className="leading-[20px] text-right">
                  <p className="text-[12px] text-[#545454]">
                    {data?.checkout_details?.customer_email}
                  </p>
                  <p className="text-[14px] text-[#545454]">
                    Pay{" "}
                    <span className="font-[600] text-primary">
                      {formatNaira(data?.checkout_details?.amount)}
                    </span>
                  </p>
                </div>
              </div>

              {currenctPage === "card"
                ? cardPage()
                : transferPage(data?.checkout_details, formatTime(timeLeft))}
            </div>
          )}
        </div>

        <IoMdClose
          className="absolute top-[6px] hidden sm:block right-[-25px] text-[#a1a1a1] text-[15px] cursor-pointer"
          onClick={() => window.history.back()}
        />
      </div>

      {/* Mobile buttons */}
      <div className="flex mt-[30px] items-center gap-2 sm:hidden">
        <Button
          onPress={() =>
            setCurrentPage(currenctPage === "card" ? "transfer" : "card")
          }
          className="bg-[#f0f0f0] flex items-center gap-1 rounded-sm text-[11px] font-[500] text-[#3e3e53] border border-[#e0e0e0] px-4 py-2"
        >
          <TbArrowsExchange className="text-[14px]" />
          Change Method
        </Button>
        <Button
          onPress={() => window.history.back()}
          className="bg-[#f0f0f0] flex items-center gap-1 rounded-sm text-[11px] font-[500] text-[#3e3e53] border border-[#e0e0e0] px-4 py-2"
        >
          <IoMdClose className="text-[14px]" />
          Cancel
        </Button>
      </div>

      <div className="p-[15px] mt-[15px] flex items-center gap-1">
        <IoMdLock className="text-[15px] text-black" />
        <p className="text-[13px] text-black mt-[3px]">
          Secured by{" "}
          <span className="lowercase font-black">{siteConfig.name}</span>
        </p>
      </div>
    </div>
  );
};

const SmhartyCheckout = () => (
  <Suspense
    fallback={
      <div className="fixed inset-0 flex items-center justify-center">
        Loading checkout...
      </div>
    }
  >
    <InnerCheckout />
  </Suspense>
);

export default SmhartyCheckout;
