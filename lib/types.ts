export type DeliveryType = "instant" | "24h" | "48h" | "72h" | "96h" | "custom";

/**
 * Which capacity pool a product consumes when ordered.
 *
 *   instant       — no human production, no slot consumed (auto-generated downloads, credit packs)
 *   standard      — uses one slot in the daily standard pool (Market Reports, Analysis modules, Country & Tariff, Company & Supplier, Geopolitical, Tenders)
 *   custom        — uses one slot in the daily custom pool (white-glove research, scoped engagements)
 *   subscription  — recurring product, no slot consumed (Newsletter, Weekly Tender Digest)
 *
 * Derived automatically from `deliveryType` + `isSubscription` if not set
 * explicitly — see deriveCapacityKind() in lib/capacity.ts.
 */
export type CapacityKind = "instant" | "standard" | "custom" | "subscription";

export type ConfigFieldType = "text" | "country" | "select" | "textarea";

export interface ConfigField {
  name: string;
  label: string;
  type: ConfigFieldType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  help?: string;
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  order: number;
}

export interface PriceTier {
  value: string;
  label: string;
  priceCents: number;
}

export interface PriceTiers {
  field: string; // config field name whose value selects the tier
  tiers: PriceTier[];
}

export interface Product {
  sku: string;
  slug: string;
  title: string;
  categorySlug: string;
  band?: string;
  shortDescription: string;
  fullDescription: string;
  includes: string[];
  priceCents: number;
  priceFrom?: boolean;
  priceSuffix?: string; // e.g. "/mo"
  altPrice?: string;
  currency: string;
  priceTiers?: PriceTiers;
  deliveryType: DeliveryType;
  isSubscription: boolean;
  isConfigurable: boolean;
  configFields?: ConfigField[];
  bundleOf?: string[];
  savingsCents?: number;
  featured?: boolean;
  previewPdfUrl?: string;
  previewPages?: number;
  /**
   * Optional override for the capacity pool this product consumes.
   * Leave undefined to let it derive from deliveryType + isSubscription.
   * Set explicitly when a SKU's capacity profile differs from its delivery SLA.
   */
  capacityKind?: CapacityKind;
}

export interface CartItemConfig {
  [key: string]: string;
}

export interface CartItem {
  sku: string;
  config: CartItemConfig;
}
