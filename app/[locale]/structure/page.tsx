import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isRtl, type Locale } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import StructureComposer from "@/components/structure/StructureComposer";
import { categoryIcons } from "@/components/ponte/category/CategoryIcons";
import { entranceFromParams } from "@/lib/desk/entrances";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { draftFromRow } from "@/lib/structure/resume";
import type { StructureDraft } from "@/lib/structure/draft";
import "@/components/find/find.css";
import "@/components/structure/structure.css";
// Category-first classification (ADR-0011) for services and distribution.
import "@/components/ponte/category/category.css";
// The approved Bridge stylesheet, imported unmodified, then the integration
// additions. Same order and same two files as the landing, because the product
// intake (ADR-0012) uses the same approved primitive rather than a local variant.
import "@/design/authority/bridge/v1/source/ponte-bridge.css";
import "@/components/ponte/bridge/bridge-integration.css";
import "@/components/ponte/bridge/completion-bridge.css";
import "@/components/ponte/state/state.css";
import "@/components/products/intake/intake.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "structure" });
  return { title: t("meta.title"), description: t("meta.description") };
}

/**
 * Structure & Submit (Journey 2). A thin server shell: it sets the locale and
 * publishes the editorial fonts, then mounts the client composer, which owns the
 * whole S01-S06 stack, the account gate and the submit. Full-bleed Brand v5
 * cream; ChromeGate drops the app's obsidian chrome on this route.
 */
export default async function StructurePage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { family?: string; intent?: string; edit?: string };
}) {
  setRequestLocale(params.locale);

  // The canonical pair a family entrance carried in. Validated here, on the
  // server, against the accepted taxonomy: a half-valid or cross-family pair
  // resolves to null and the composer opens at its own first step rather than
  // starting a member in a family they did not choose.
  const entrance = entranceFromParams({
    family: searchParams?.family,
    intent: searchParams?.intent,
  });

  // A saved draft, resumed. `?edit=<id>` is the contract the listing edit path
  // already uses; this reads the same row rather than introducing a second
  // store. Ownership is enforced by the query AND by RLS, so a guessed id
  // returns nothing rather than somebody else's record.
  //
  // A read that fails leaves `initial` null and the composer opens fresh. That
  // is the honest failure: it is better to start again than to resume half a
  // record and let the member submit it believing it is whole.
  let initial: StructureDraft | null = null;
  if (searchParams?.edit) {
    initial = await loadDraft(searchParams.edit);
  }

  return (
    <div className={landingFontVars} dir={isRtl(params.locale) ? "rtl" : "ltr"}>
      {/* The category icons are rendered here, on the server, and handed to
          the client composer as nodes. PonteIcon stays the one renderer and
          the registry's markup never reaches the browser bundle. */}
      <StructureComposer entrance={entrance} initial={initial} icons={categoryIcons()} />
    </div>
  );
}

/**
 * Read one of the member's own listings back into a draft.
 *
 * Selected column by column rather than with `*`: the family-terms columns
 * arrive with `20260728d`, which is not applied, and naming them explicitly is
 * what lets the absent-column case be caught and retried instead of failing the
 * whole read.
 */
async function loadDraft(id: string): Promise<StructureDraft | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = createClient();
  const BASE =
    "id, status, type, product, hs_code, quantity, quantity_mode, quantity_min, quantity_max, " +
    "unit, frequency, origin, destination, incoterm, payment_terms, submitter_role, key_notes, " +
    "validity_type, valid_until, declaration_accepted_at, market_family, market_intent, " +
    "service_category_key, service_subcategory_keys, distribution_partner_type_key, " +
    "distribution_relationship_terms, coverage_scope_key, territory_codes, product_sector_key, " +
    "custom_category_label, additional_details";

  const read = async (columns: string) =>
    supabase
      .from("listings")
      .select(columns)
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

  // With the family terms first, then without them. The submit route already
  // degrades this way for the same columns; the read has to match, or a member
  // on today's schema cannot resume a draft at all.
  let { data, error } = await read(`${BASE}, service_terms, distribution_terms`);
  if (error) ({ data, error } = await read(BASE));
  if (error || !data) return null;

  try {
    return draftFromRow(data as never);
  } catch (err) {
    // An unrecognised stored family throws rather than resuming as a product.
    console.error("[ponte] could not resume draft:", err);
    return null;
  }
}
