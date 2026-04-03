"use client";
import { useEffect, useState, useMemo, Suspense, useRef } from "react";
import { Button } from "@heroui/button";
import { formatNaira } from "@/helpers/formatAmount";
import { PiCreditCard, PiBank } from "react-icons/pi";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import { TbCopy, TbCheck, TbArrowsExchange } from "react-icons/tb";
import { IoCard } from "react-icons/io5";
import { IoMdClose, IoMdLock } from "react-icons/io";
import { siteConfig } from "@/config/site";
import { PiCopySimple } from "react-icons/pi";
import { copyToClipboard } from "@/helpers/copytext";

interface ClientCheckoutProps {
  initialRef: string;
  initialDent: string;
}

export default function ClientCheckout({
  initialRef,
  initialDent,
}: ClientCheckoutProps) {
  const [selectedMethod, setSelectedMethod] = useState<"card" | "transfer">(
    "transfer",
  );
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<
    "idle" | "success" | "failed"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [currenctPage, setCurrentPage] = useState("transfer");

  // 15 minutes in seconds (changed from original 30 min comment)
  const EXPIRY_SECONDS = 15 * 60;
  const [timeLeft, setTimeLeft] = useState(EXPIRY_SECONDS);
  // const [dent, setDent] = useState<string | null>(null);

  const initRef = initialRef;

  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    resolvePaymentReference();
  }, []);

  useEffect(() => {
    if (selectedMethod !== "transfer" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedMethod, timeLeft]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const resolvePaymentReference = async () => {
    try {
      if (!initialRef || !initialDent) {
        throw new Error("Missing payment parameters (ref or dent)");
      }

      const response = await fetch(`/api/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          reference: initialRef,
          dent: initialDent,
        }),
      });

      const result = await response.json();

      if (result.status === 200 && result.data) {
        setData(result.data);
        setError(null);
      } else {
        setError(
          result.message || result.error || "Failed to load payment details",
        );
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!data?.reference) return;
    setVerifyLoading(true);
    setVerifyStatus("idle");
    setVerifyMessage("");

    try {
      const res = await fetch(`/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: data.reference,
          // dent: dent,
        }),
      });

      const json = await res.json();

      if (
        json.status === "success" ||
        json.data?.status === "success" ||
        json.data?.status === "completed"
      ) {
        // Save
        localStorage.setItem("lastPaymentData", JSON.stringify(data));

        setVerifyStatus("success");
        setVerifyMessage("Payment confirmed! Thank you.");
        setShowSuccess(true);
        setSuccessMessage(json.message || "Your payment was successful.");

        const redirectUrl = data.checkout_details?.redirect_url;
        if (redirectUrl) {
          // Tell parent window to do the redirect
          window.parent.postMessage(
            {
              type: "smharty-redirect",
              url: redirectUrl,
            },
            "*", // ← change to specific origin in production!
          );
        } else {
          // Redirect to our own success page if no redirect URL by business
          window.location.href = "/success";
        }
      } else {
        setVerifyStatus("idle");
        setVerifyMessage("not_confirmed");
      }
    } catch (err) {
      setVerifyStatus("failed");
      setVerifyMessage("Something went wrong. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const changeCurrentPage = (page: string) => {
    setCurrentPage(page);
  };

  const paymentMethods = [
    // {
    //   title: "SmhartPay",
    //   card: (
    //     <BsFillSendFill
    //       className={`text-[14px] ${currenctPage === "smhartpay" ? "text-primary" : "text-[#6e6e6e]"}`}
    //     />
    //   ),
    //   page: "smhartpay",
    // },
    {
      title: "Card",
      card: (
        <IoCard
          className={`text-[16px] ${currenctPage === "card" ? "text-primary" : "text-[#6e6e6e]"}`}
        />
      ),
      page: "card",
    },
    {
      title: "Transfer",
      card: (
        <PiBank
          className={`text-[16px] ${currenctPage === "transfer" ? "text-primary" : "text-[#6e6e6e]"}`}
        />
      ),
      page: "transfer",
    },
  ];

  // Transfer page
  const transferPage = (data: any, time: any) => {
    return (
      <div className="px-[20px] flex-1 flex flex-col">
        <div className="basis-[60%] flex flex-col">
          <p className="text-center text-[#1b1a22] py-[20px] font-medium text-[14px]">
            Transfer {formatNaira(data?.amount)} to {siteConfig.name} Checkout
          </p>
          <div className="bg-[#f4f4f4] min-h-[190px] justify-between rounded-lg p-[20px] flex-1 flex flex-col">
            <div className="leading-[20px]">
              <p className="text-[9px] text-[#2b2b2b]">BANK NAME</p>
              <p className="text-[14px] font-medium text-[#393939]">
                {data?.bank_account?.bank_name}
              </p>
            </div>
            <div className="flex items-end justify-between">
              <div className="leading-[20px]">
                <p className="text-[9px] text-[#2b2b2b]">ACCOUNT NUMBER</p>
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
                <p className="text-[9px] text-[#2b2b2b]">AMOUNT</p>
                <p className="text-[14px] font-medium text-[#393939]">
                  {formatNaira(data?.amount)}
                </p>
              </div>
              <PiCopySimple
                className="text-[14px] cursor-pointer text-[#6e6e6e]"
                onClick={() =>
                  copyToClipboard(data?.bank_account?.account_number)
                }
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
            onPress={() => handleVerifyPayment()}
            disabled={verifyLoading}
            className="w-full bg-transparent mt-[10px] rounded-sm cursor-pointer text-[13px] font-[500] text-[#3f3f3f] border-1 border-[#e0e0e0] py-[10px] relative"
          >
            {verifyLoading ? (
              <>
                <Spinner size="sm" className="mr-2 inline" />
                Confirming payment...
              </>
            ) : verifyMessage == "not_confirmed" && verifyStatus === "idle" ? (
              "Try confirming again"
            ) : (
              "I've made payment"
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white sm:bg-[#fafafa] flex flex-col pt-0 sm:pt-[100px] items-center h-[100svh]">
      <div className="max-w-full relative sm:max-w-[490px] rounded-lg sm:border-1 sm:border-gray-200 w-full flex items-center h-[500px]">
        <div className="w-[28%] pt-[10px] rounded-l-lg pl-[10px] hidden sm:block h-[100%] bg-[#f4f4f4]">
          <div className="h-[50px] w-full border-b-1 border-[#e2e2e2] flex items-center justify-start">
            <p className="text-[12px] text-[#484646] font-bold">PAY WITH</p>
          </div>
          {paymentMethods.map((v) => (
            <div
              key={v.title}
              onClick={() => {
                changeCurrentPage(v.page);
              }}
              className="h-[45px] cursor-pointer w-full border-b-[0.6px] border-[#e2e2e2] flex items-center justify-start"
            >
              <div className="flex items-center gap-2">
                {v.card}
                <p
                  className={`text-[13px] mt-[3px] font-medium text-[#6e6e6e] ${currenctPage === v.page ? "text-primary" : ""}`}
                >
                  {v.title}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 sm:pt-[10px]  rounded-r-lg sm:w-[65%] h-[100%] bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="sm:hidden px-[20px] py-[12px] bg-[#f4f4f4]">
                <div className="flex items-center gap-2">
                  {currenctPage === "card" ? (
                    <IoCard className={`text-[19px] text-primary`} />
                  ) : (
                    <PiBank className={`text-[19px] text-primary`} />
                  )}
                  <p
                    className={`text-[15px] mt-[3px] capitalize font-medium text-[#2e2e2e]`}
                  >
                    {currenctPage}
                  </p>
                </div>
              </div>
              <div className="h-[70px] sm:h-[50px] py-[15px] sm:py-0 px-[20px] pb-[15px] border-b-1 border-[#f3f3f3] flex items-center justify-between">
                <img
                  src={data?.checkout_details?.business_logo ?? "/logo.png"}
                  alt=""
                  className="w-[30px] h-[30px] rounded-md object-cover"
                />
                <div className="leading-[20px]">
                  <p className="text-[12px] text-[#545454]">
                    {data?.checkout_details?.customer_email}
                  </p>
                  <p className="text-right text-[14px] text-[#545454]">
                    <span className="">Pay</span>{" "}
                    <span className="font-[600] text-primary">
                      {formatNaira(data?.checkout_details?.amount)}
                    </span>
                  </p>
                </div>
              </div>
              {currenctPage === "card"
                ? cardPage()
                : currenctPage === "transfer"
                  ? transferPage(data?.checkout_details, formatTime(timeLeft))
                  : smhartyPage()}
            </div>
          )}
        </div>
        <IoMdClose
          className="absolute top-[6px] hidden sm:block right-[-25px] text-[#a1a1a1] text-[15px] cursor-pointer"
          onClick={() => {
            window.history.back();
          }}
        />
      </div>
      <div className="flex flex-col items-center">
        {/* Change method and Cancel payment buttons */}
        <div className="flex mt-[30px] items-center gap-2 sm:hidden">
          <Button
            onPress={() => {
              changeCurrentPage(currenctPage === "card" ? "transfer" : "card");
            }}
            className="bg-[#f0f0f0] flex items-center gap-1 rounded-sm cursor-pointer text-[11px] sm:text-[13px] font-[500] text-[#3e3e53] border-1 border-[#e0e0e0] py-[px]"
          >
            <TbArrowsExchange className="text-[14px]" />
            Change Payment Method
          </Button>
          <Button
            onPress={() => {
              window.history.back();
            }}
            className="bg-[#f0f0f0] flex items-center gap-1 rounded-sm cursor-pointer text-[11px] sm:text-[13px] font-[500] text-[#3e3e53] border-1 border-[#e0e0e0] py-[px]"
          >
            <IoMdClose className="text-[14px]" />
            Cancel Payment
          </Button>
        </div>
        <div className="p-[15px] mt-[15px] flex items-center gap-1">
          <IoMdLock className="text-[15px] text-[#030a2f]" />
          <p className="text-[13px] text-[#030a2f] mt-[3px]">
            Secured by{" "}
            <span className=" lowercase font-black ">{siteConfig.name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// const SmhartyCheckout = () => {
//   return (
//     <Suspense
//       fallback={
//         <div className="fixed inset-0 flex items-center justify-center bg-background/80">
//           <p>Loading checkout...</p>
//         </div>
//       }
//     >
//       <ClientCheckout initialRef="" initialDent="" />
//     </Suspense>
//   );
// };

// Card page
const cardPage = () => {
  return (
    <div className="px-[20px]">
      <p>Card Payment</p>
    </div>
  );
};

// SmhartPay page
const smhartyPage = () => {
  return (
    <div>
      <p>SmhartPay</p>
    </div>
  );
};

// export ClientCheckout;
