import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isRtl, type Locale } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import StructureComposer from "@/components/structure/StructureComposer";
import { categoryIcons } from "@/components/ponte/category/CategoryIcons";
import { entranceFromParams } from "@/lib/desk/entrances";
import { isMissingColumnError } from "@/lib/listings/classification";
import ResumeNotice from "@/components/structure/ResumeNotice";
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
  let resumeFailure: ResumeFailure | null = null;
  if (searchParams?.edit) {
    const resumed = await loadDraft(searchParams.edit);
    initial = resumed.draft;
    resumeFailure = resumed.failure;
  }

  return (
    <div className={landingFontVars} dir={isRtl(params.locale) ? "rtl" : "ltr"}>
      {/* The category icons are rendered here, on the server, and handed to
          the client composer as nodes. PonteIcon stays the one renderer and
          the registry's markup never reaches the browser bundle. */}
      {/*
        A resume that failed says so.

        It used to leave `initial` null and open a fresh composer, on the
        reasoning that starting again beats resuming half a record. The first
        half of that is right and is kept; the second half was wrong, because
        the member was not told. Following "Complete your listing" from an
        email that names PT-0112 and arriving at "Nothing started yet" reads as
        the record having been lost.
      */}
      {resumeFailure ? (
        <ResumeNotice failure={resumeFailure} locale={params.locale} reference={searchParams?.edit ?? ""} />
      ) : null}
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
/** Why a resume failed. The member is told, rather than shown a blank page. */
export type ResumeFailure = "signed_out" | "not_found" | "unreadable";

async function loadDraft(
  id: string,
): Promise<{ draft: StructureDraft; failure: null } | { draft: null; failure: ResumeFailure }> {
  const user = await getUser();
  if (!user) return { draft: null, failure: "signed_out" };

  const supabase = createClient();

  /*
    A LADDER, not a single retry.
    -----------------------------
    This read named its columns explicitly and retried exactly once, dropping
    only `service_terms` and `distribution_terms`. Any OTHER column absent from
    the deployed schema failed both attempts, and the page then opened a fresh
    composer.

    That is what the owner hit on 1 August 2026: the email said "your trade
    service is saved" and named PT-0112, the button led to `?edit=<id>`, and
    the composer said "Nothing started yet".

    So the read now degrades in steps, from everything down to a core that has
    existed since the table did. A member resuming on an older schema loses the
    columns their deployment does not have; they do not lose the record.
  */
  const CORE =
    "id, status, type, product, hs_code, quantity, unit, frequency, origin, destination, " +
    "incoterm, payment_terms, submitter_role, key_notes, validity_type, valid_until";
  const QUANTITY = "quantity_mode, quantity_min, quantity_max, declaration_accepted_at";
  const CANONICAL = "market_family, market_intent, product_sector_key, custom_category_label, additional_details";
  const FAMILY_KEYS =
    "service_category_key, service_subcategory_keys, distribution_partner_type_key, " +
    "distribution_relationship_terms, coverage_scope_key, territory_codes";
  const FAMILY_TERMS = "service_terms, distribution_terms";

  const LADDER = [
    [CORE, QUANTITY, CANONICAL, FAMILY_KEYS, FAMILY_TERMS].join(", "),
    [CORE, QUANTITY, CANONICAL, FAMILY_KEYS].join(", "),
    [CORE, QUANTITY, CANONICAL].join(", "),
    [CORE, QUANTITY].join(", "),
    CORE,
  ];

  const read = async (columns: string) =>
    supabase.from("listings").select(columns).eq("id", id).eq("user_id", user.id).maybeSingle();

  let data: unknown = null;
  let lastError: unknown = null;
  for (const columns of LADDER) {
    const result = await read(columns);
    if (!result.error) {
      data = result.data;
      lastError = null;
      break;
    }
    lastError = result.error;
    // Only a MISSING COLUMN earns the next rung. Any other failure is a real
    // failure and must not be retried into silence.
    if (!isMissingColumnError(result.error)) break;
  }

  if (lastError) {
    console.error("[ponte] could not read draft for resume:", lastError);
    return { draft: null, failure: "unreadable" };
  }
  // No row: either it does not exist, or it is not this member's. Both are the
  // same answer to the member and neither confirms the other's record exists.
  if (!data) return { draft: null, failure: "not_found" };

  try {
    return { draft: draftFromRow(data as never), failure: null };
  } catch (err) {
    // An unrecognised stored family throws rather than resuming as a product.
    console.error("[ponte] could not resume draft:", err);
    return { draft: null, failure: "unreadable" };
  }
}
