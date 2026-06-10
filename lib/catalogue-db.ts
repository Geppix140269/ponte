// Async DB-backed catalogue accessors.
// If Supabase is configured, reads from the database (respects RLS).
// Falls back to the static lib/catalogue.ts arrays when Supabase is not configured
// or on error — preserving the existing graceful-degradation pattern.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/auth";
import type { Category, DeliveryType, Product } from "@/lib/types";
import {
  CATEGORIES as STATIC_CATEGORIES,
  PRODUCTS as STATIC_PRODUCTS,
  getProduct as staticGetProduct,
  getProductBySku as staticGetProductBySku,
  getCategory as staticGetCategory,
  productsByCategory as staticProductsByCategory,
  featuredProducts as staticFeaturedProducts,
  relatedProducts as staticRelatedProducts,
} from "@/lib/catalogue";

// ---- Row → Product mapper -----------------------------------------------

function mapRow(row: any): Product {
  return {
    sku: row.sku,
    slug: row.slug,
    title: row.title,
    categorySlug: row.categories?.slug ?? "",
    band: row.band ?? undefined,
    shortDescription: row.short_description ?? "",
    fullDescription: row.full_description ?? "",
    includes: Array.isArray(row.includes) ? row.includes : [],
    priceCents: row.price_cents ?? 0,
    priceFrom: row.price_from ?? false,
    priceSuffix: row.price_suffix ?? undefined,
    altPrice: row.alt_price ?? undefined,
    currency: row.currency ?? "USD",
    priceTiers: row.price_tiers ?? undefined,
    deliveryType: (row.delivery_type ?? "custom") as DeliveryType,
    isSubscription: row.is_subscription ?? false,
    isConfigurable: row.is_configurable ?? false,
    configFields: row.config_fields ?? undefined,
    savingsCents: row.savings_cents ?? undefined,
    featured: row.featured ?? false,
    cobrandable: row.cobrandable ?? false,
    previewPdfUrl: row.preview_pdf_url ?? undefined,
    previewPages: row.preview_pages ?? undefined,
  };
}

function mapCategoryRow(row: any): Category {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    order: row.display_order ?? 0,
  };
}

const PRODUCT_QUERY = "*, categories(slug)";

// ---- Public async accessors ---------------------------------------------

export async function getAllProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return STATIC_PRODUCTS;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_QUERY)
      .eq("status", "published")
      .order("sku");
    return (data ?? []).map(mapRow);
  } catch {
    return STATIC_PRODUCTS;
  }
}

export async function getAllCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return STATIC_CATEGORIES;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");
    return (data ?? []).map(mapCategoryRow);
  } catch {
    return STATIC_CATEGORIES;
  }
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  if (!isSupabaseConfigured()) return staticGetProduct(slug);
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_QUERY)
      .eq("slug", slug)
      .maybeSingle();
    return data ? mapRow(data) : undefined;
  } catch {
    return staticGetProduct(slug);
  }
}

export async function getProductBySku(sku: string): Promise<Product | undefined> {
  if (!isSupabaseConfigured()) return staticGetProductBySku(sku);
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_QUERY)
      .eq("sku", sku)
      .maybeSingle();
    return data ? mapRow(data) : undefined;
  } catch {
    return staticGetProductBySku(sku);
  }
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  if (!isSupabaseConfigured()) return staticGetCategory(slug);
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return data ? mapCategoryRow(data) : undefined;
  } catch {
    return staticGetCategory(slug);
  }
}

export async function productsByCategory(slug: string): Promise<Product[]> {
  if (!isSupabaseConfigured()) return staticProductsByCategory(slug);
  try {
    const supabase = createClient();
    const catResult = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!catResult.data) return staticProductsByCategory(slug);
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_QUERY)
      .eq("category_id", catResult.data.id)
      .eq("status", "published")
      .order("sku");
    return (data ?? []).map(mapRow);
  } catch {
    return staticProductsByCategory(slug);
  }
}

export async function featuredProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return staticFeaturedProducts();
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_QUERY)
      .eq("featured", true)
      .eq("status", "published")
      .order("sku");
    return (data ?? []).map(mapRow);
  } catch {
    return staticFeaturedProducts();
  }
}

export async function relatedProducts(
  product: Product,
  limit = 3,
): Promise<Product[]> {
  if (!isSupabaseConfigured()) return staticRelatedProducts(product, limit);
  try {
    const supabase = createClient();
    const catResult = await supabase
      .from("categories")
      .select("id")
      .eq("slug", product.categorySlug)
      .maybeSingle();
    if (!catResult.data) return staticRelatedProducts(product, limit);
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_QUERY)
      .eq("category_id", catResult.data.id)
      .eq("status", "published")
      .neq("sku", product.sku)
      .order("sku")
      .limit(limit);
    return (data ?? []).map(mapRow);
  } catch {
    return staticRelatedProducts(product, limit);
  }
}
