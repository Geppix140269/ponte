import type { CartItemConfig, Product } from "./types";

export function formatPrice(cents: number, currency = "USD"): string {
  const value = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return formatted;
}

// Resolves the actual price for a product given a configuration. For products
// with tiered pricing, the selected tier's price wins; otherwise the base
// priceCents is used.
export function effectivePriceCents(
  product: Product,
  config?: CartItemConfig,
): number {
  if (product.priceTiers && config) {
    const selected = config[product.priceTiers.field];
    const tier = product.priceTiers.tiers.find((t) => t.value === selected);
    if (tier) return tier.priceCents;
  }
  return product.priceCents;
}

export function displayPrice(product: Product): string {
  if (product.altPrice) return product.altPrice;
  const base = formatPrice(product.priceCents, product.currency);
  const prefix = product.priceFrom ? "From " : "";
  const suffix = product.priceSuffix ?? "";
  return `${prefix}${base}${suffix}`;
}

// Generic delivery labels used as fallback (e.g., on ProductCard which is
// a server component but doesn't compute the slot for performance). The
// authoritative customer-facing delivery promise comes from
// nextAvailableSlot + formatSlot on the product detail page.
export const DELIVERY_LABEL: Record<string, string> = {
  instant: "Instant download",
  "24h": "Standard turnaround",
  "48h": "Standard turnaround",
  "72h": "Standard turnaround",
  "96h": "Standard turnaround",
  custom: "Custom timeline",
};
