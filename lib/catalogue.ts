import type { Category, Product } from "./types";

// ---- Categories -----------------------------------------------------------
// Ponte sells a single data product, the Full Market Report. The storefront
// keeps one category so the catalogue, category and checkout flows still work.
export const CATEGORIES: Category[] = [
  {
    slug: "market-reports",
    name: "Market Reports",
    description:
      "Senior-led market reports for one HS code or product, delivered Global or for a single destination country.",
    order: 1,
  },
];

const USD = "USD";

// ---- Products -------------------------------------------------------------
// One product only: the Full Market Report. Senior-led trade intelligence,
// grounded in transaction-level trade evidence and official sources. Bought
// through the existing cart -> /api/checkout -> Stripe flow.
export const PRODUCTS: Product[] = [
  {
    sku: "MR-001",
    slug: "full-market-report",
    title: "Full Market Report",
    categorySlug: "market-reports",
    band: "Market Report",
    shortDescription:
      "A complete market report for one HS code or product, delivered either Global or for a single destination country, with senior-analyst sign-off before it ships.",
    fullDescription:
      "A complete market report for one HS code or product, delivered either Global or for a single destination country. It maps demand, sets out the regulatory and tariff context, profiles the competitive landscape, and identifies active counterparties. Every report is reviewed and signed off by a senior analyst before delivery, grounded in transaction-level trade evidence and official sources.",
    includes: ["64-page PDF", "Counterparty data", "Source citations"],
    priceCents: 180000,
    currency: USD,
    deliveryType: "custom",
    isSubscription: false,
    isConfigurable: true,
    cobrandable: true,
    featured: true,
    configFields: [
      {
        name: "hs_code",
        label: "HS code or product",
        type: "text",
        required: true,
        placeholder: "e.g. 0902.10, or describe the product",
      },
      {
        name: "scope",
        label: "Scope",
        type: "select",
        required: true,
        options: [
          { value: "global", label: "Global" },
          { value: "single", label: "Single destination country" },
        ],
      },
      {
        name: "country",
        label: "Destination country (for single-country scope)",
        type: "country",
        required: false,
      },
    ],
  },
];

// ---- Lookups --------------------------------------------------------------
export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductBySku(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function productsByCategory(slug: string): Product[] {
  return PRODUCTS.filter((p) => p.categorySlug === slug);
}

export function featuredProducts(): Product[] {
  return PRODUCTS.filter((p) => p.featured);
}

export function relatedProducts(product: Product, limit = 3): Product[] {
  return PRODUCTS.filter(
    (p) => p.categorySlug === product.categorySlug && p.sku !== product.sku,
  ).slice(0, limit);
}
