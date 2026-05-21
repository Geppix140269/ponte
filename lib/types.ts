export type DeliveryType = "instant" | "24h" | "48h" | "custom";

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
  altPrice?: string; // e.g. "or €249/yr"
  currency: string;
  deliveryType: DeliveryType;
  isSubscription: boolean;
  isConfigurable: boolean;
  configFields?: ConfigField[];
  bundleOf?: string[];
  savingsCents?: number;
  featured?: boolean;
}

export interface CartItemConfig {
  [key: string]: string;
}

export interface CartItem {
  sku: string;
  config: CartItemConfig;
}
