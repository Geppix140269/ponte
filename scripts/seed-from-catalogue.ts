// Upserts CATEGORIES and PRODUCTS from lib/catalogue.ts into Supabase.
// Run AFTER the migration:
//   node --experimental-strip-types --env-file .env.local scripts/seed-from-catalogue.ts
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES, PRODUCTS } from "../lib/catalogue.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- 1. Upsert categories ------------------------------------------------
console.log("Seeding categories…");
const { error: catErr } = await supabase.from("categories").upsert(
  CATEGORIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    display_order: c.order,
  })),
  { onConflict: "slug" },
);
if (catErr) { console.error("Category upsert failed:", catErr.message); process.exit(1); }
console.log(`  ✓ ${CATEGORIES.length} categories`);

// ---- 2. Fetch category slug → id map ------------------------------------
const { data: catRows, error: catFetchErr } = await supabase
  .from("categories")
  .select("id, slug");
if (catFetchErr || !catRows) {
  console.error("Failed to fetch categories:", catFetchErr?.message);
  process.exit(1);
}
const catMap = Object.fromEntries(catRows.map((c: any) => [c.slug, c.id]));

// ---- 3. Upsert products --------------------------------------------------
console.log("Seeding products…");
const productRows = PRODUCTS.map((p) => ({
  sku: p.sku,
  slug: p.slug,
  title: p.title,
  category_id: catMap[p.categorySlug],
  band: p.band ?? null,
  short_description: p.shortDescription,
  full_description: p.fullDescription,
  includes: p.includes ?? [],
  price_cents: p.priceCents,
  price_from: p.priceFrom ?? false,
  price_suffix: p.priceSuffix ?? null,
  alt_price: p.altPrice ?? null,
  currency: p.currency,
  price_tiers: p.priceTiers ?? null,
  delivery_type: p.deliveryType,
  is_subscription: p.isSubscription,
  is_configurable: p.isConfigurable,
  config_fields: p.configFields ?? null,
  savings_cents: p.savingsCents ?? null,
  featured: p.featured ?? false,
  status: "published",
}));

const { error: prodErr } = await supabase
  .from("products")
  .upsert(productRows, { onConflict: "sku" });
if (prodErr) { console.error("Product upsert failed:", prodErr.message); process.exit(1); }
console.log(`  ✓ ${PRODUCTS.length} products`);

// ---- 4. Build SKU → UUID map for bundle_items ---------------------------
const { data: prodRows, error: prodFetchErr } = await supabase
  .from("products")
  .select("id, sku");
if (prodFetchErr || !prodRows) {
  console.error("Failed to fetch products:", prodFetchErr?.message);
  process.exit(1);
}
const skuMap = Object.fromEntries(prodRows.map((p: any) => [p.sku, p.id]));

// ---- 5. Upsert bundle_items ---------------------------------------------
const bundles = PRODUCTS.filter((p) => p.bundleOf && p.bundleOf.length > 0);
if (bundles.length > 0) {
  console.log("Seeding bundle_items…");

  // Delete existing bundle entries for these products first
  for (const bundle of bundles) {
    const bundleId = skuMap[bundle.sku];
    if (!bundleId) continue;
    await supabase.from("bundle_items").delete().eq("bundle_product_id", bundleId);
  }

  const bundleRows: { bundle_product_id: string; component_product_id: string }[] = [];
  for (const bundle of bundles) {
    const bundleId = skuMap[bundle.sku];
    if (!bundleId) { console.warn(`  ⚠ No DB id for bundle ${bundle.sku}`); continue; }
    for (const compSku of bundle.bundleOf!) {
      const compId = skuMap[compSku];
      if (!compId) { console.warn(`  ⚠ No DB id for component ${compSku}`); continue; }
      bundleRows.push({ bundle_product_id: bundleId, component_product_id: compId });
    }
  }

  const { error: biErr } = await supabase.from("bundle_items").upsert(bundleRows, {
    onConflict: "bundle_product_id,component_product_id",
  });
  if (biErr) { console.error("bundle_items upsert failed:", biErr.message); process.exit(1); }
  console.log(`  ✓ ${bundleRows.length} bundle_items across ${bundles.length} bundles`);
}

console.log("\n✅ Seed complete.");
