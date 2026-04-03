/**
 * Formats amount to Nigerian Naira using Intl API
 * Most reliable cross-browser way
 */
export function formatNaira(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);

  if (isNaN(num)) {
    return "₦0.00";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
