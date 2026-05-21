import type { Product } from "./types";

export function formatPrice(cents: number, currency = "EUR"): string {
  const value = cents / 100;
  const formatted = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return formatted;
}

export function displayPrice(product: Product): string {
  const base = formatPrice(product.priceCents, product.currency);
  const prefix = product.priceFrom ? "From " : "";
  const suffix = product.priceSuffix ?? "";
  return `${prefix}${base}${suffix}`;
}

export const DELIVERY_LABEL: Record<string, string> = {
  instant: "Instant download",
  "24h": "Delivered in 24h",
  "48h": "Delivered in 48h",
  custom: "Custom timeline",
};
