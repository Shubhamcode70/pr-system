// Indian Rupee formatting helpers
const fmt = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
});
const fmtPlain = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function inr(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "₹0.00";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(v)) return "₹0.00";
  return fmt.format(v);
}
export function inrPlain(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "0.00";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(v)) return "0.00";
  return fmtPlain.format(v);
}
