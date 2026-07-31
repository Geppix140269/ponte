// One published record, read in the reader's own language.
//
// This was owned by `app/[locale]/marketplace/l/[ref]/page.tsx` and by nothing
// else. That page is on the retirement path (`lib/navigation/route-manifest.ts`
// records `/marketplace/l/[ref]` -> `/find/o/[ref]`), so the capability had to
// leave the page before the page leaves. It is EXTRACTED rather than copied:
// the surviving Find detail page cannot be made to depend on a file that is
// about to be deleted, and two copies of a cache-and-translate rule would drift
// apart the first time either changed.
//
// Nothing here is a presentation decision. Which language a page opens in, and
// what the switcher looks like, belong to the page. This module answers one
// question: what does this record say in language X. It answers it once per
// record/language pair, and caches the answer in `listing_translations`.

import { createAdminClient } from "@/lib/supabase/server";
import { translateListing } from "@/lib/ai-vet";

/** The two free-text fields a reader actually reads. */
export type ListingTranslation = { product: string; details: string };

/** The stored record being translated. Its id is the cache key. */
export type TranslatableListing = { id: string; product: string; details: string };

// Languages a reader can flip the listing into. Each listing/language pair
// is translated once by AI and cached in listing_translations.
export const LISTING_LANGS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "de", label: "Deutsch" },
  { code: "hi", label: "हिन्दी" },
  { code: "it", label: "Italiano" },
];

// Read an already cached translation. Nothing is generated here, so this is
// safe to call on a page load the reader did not ask for.
export async function cachedListingTranslation(
  listingId: string,
  lang: string,
): Promise<ListingTranslation | null> {
  const adminSb = createAdminClient();
  const { data } = await adminSb
    .from("listing_translations")
    .select("product, details")
    .eq("listing_id", listingId)
    .eq("lang", lang)
    .maybeSingle();
  return data ?? null;
}

// Serve a cached translation, or translate once and cache it.
export async function getListingTranslation(
  listing: TranslatableListing,
  lang: string,
): Promise<ListingTranslation | null> {
  const adminSb = createAdminClient();
  const cached = await cachedListingTranslation(listing.id, lang);
  if (cached) return cached;

  const fresh = await translateListing(
    { product: listing.product, details: listing.details },
    lang,
  );
  if (!fresh) return null;
  await adminSb.from("listing_translations").insert({
    listing_id: listing.id,
    lang,
    product: fresh.product.slice(0, 300),
    details: fresh.details.slice(0, 4000),
  });
  return fresh;
}
