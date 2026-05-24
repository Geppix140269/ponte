"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// ---- Auth guard ---------------------------------------------------------

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") throw new Error("Forbidden");
}

function revalidateAll(slug?: string) {
  if (slug) revalidatePath(`/product/${slug}`);
  revalidatePath("/catalogue");
  revalidatePath("/");
  // Revalidate all category pages
  revalidatePath("/category/[slug]", "page");
}

// ---- Helpers ------------------------------------------------------------

function parseIncludes(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCents(raw: string): number {
  return Math.round(parseFloat(raw || "0") * 100);
}

function parseJsonField(raw: string): unknown | null {
  if (!raw || raw.trim() === "") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---- Save product (create or update) ------------------------------------

export async function saveProduct(formData: FormData) {
  await assertAdmin();
  const supabase = createAdminClient();

  const id = formData.get("id") as string | null;
  const slug = formData.get("slug") as string;

  const row = {
    sku: (formData.get("sku") as string).toUpperCase().trim(),
    slug: slug.toLowerCase().trim().replace(/\s+/g, "-"),
    title: formData.get("title") as string,
    category_id: formData.get("category_id") as string,
    band: (formData.get("band") as string) || null,
    short_description: formData.get("short_description") as string,
    full_description: formData.get("full_description") as string,
    includes: parseIncludes(formData.get("includes") as string),
    price_cents: parseCents(formData.get("price") as string),
    price_from: formData.get("price_from") === "on",
    price_suffix: (formData.get("price_suffix") as string) || null,
    alt_price: (formData.get("alt_price") as string) || null,
    currency: (formData.get("currency") as string) || "USD",
    savings_cents: formData.get("savings")
      ? parseCents(formData.get("savings") as string)
      : null,
    delivery_type: formData.get("delivery_type") as string,
    is_subscription: formData.get("is_subscription") === "on",
    is_configurable: formData.get("is_configurable") === "on",
    config_fields: parseJsonField(formData.get("config_fields") as string),
    price_tiers: parseJsonField(formData.get("price_tiers") as string),
    featured: formData.get("featured") === "on",
    status: formData.get("status") as string,
    preview_pdf_url: (formData.get("preview_pdf_url") as string) || null,
    preview_pages: formData.get("preview_pages")
      ? parseInt(formData.get("preview_pages") as string, 10)
      : null,
  };

  if (id) {
    const { error } = await supabase
      .from("products")
      .update(row)
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("products").insert(row);
    if (error) throw new Error(error.message);
  }

  revalidateAll(row.slug);
  redirect("/admin/products");
}

// ---- Archive product ----------------------------------------------------

export async function archiveProduct(id: string, slug: string) {
  await assertAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateAll(slug);
  redirect("/admin/products");
}
