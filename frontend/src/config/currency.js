export const BILLING_CURRENCY = (
  import.meta.env.VITE_BILLING_CURRENCY || "ETB"
).toUpperCase();

export const formatCurrency = (amount, currency = BILLING_CURRENCY) =>
  new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency,
  }).format(Number(amount) || 0);
