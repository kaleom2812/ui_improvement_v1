// Display-only formatting helpers for the Admin Dashboard.
//
// The backend stores money in the smallest currency unit (paise for INR) and
// dates as ISO-8601 strings. These helpers format for display and NEVER mutate
// the API values. The rupee convention matches the Overview page (Stage 7A):
// 100 -> "₹1.00", 500 -> "₹5.00".

/** Minor units -> "₹x.xx". Used where the currency is always INR (e.g. revenue). */
export function formatRevenueInr(minorUnits: number): string {
  const rupees = (Number.isFinite(minorUnits) ? minorUnits : 0) / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Minor units + currency code -> a friendly amount string. INR renders as ₹. */
export function formatMoneyMinor(minorUnits: number, currency: string | null | undefined): string {
  const major = (Number.isFinite(minorUnits) ? minorUnits : 0) / 100;
  const code = (currency ?? "").toUpperCase();
  if (code === "INR" || code === "") {
    return `₹${major.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
}

/** ISO date string -> "May 1, 2026" (UTC, so it is stable regardless of TZ). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Numeric score -> one decimal place, or "—" when the backend has no value. */
export function formatScore(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "—";
}
