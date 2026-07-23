import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUser, isSupabaseConfigured } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ListingForm, { type ListingInitial } from "@/components/ListingForm";
import { parseVolume } from "@/lib/listing-terms";
import { alternatesFor } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "marketplace",
  });

  return {
    title: t("new.meta.title"),
    description: t("new.meta.description"),
    alternates: alternatesFor("/marketplace/new", params.locale),
  };
}

type ListingType = "offer" | "requirement" | "service";

export default async function NewListingPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { type?: string; restore?: string; edit?: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("marketplace");

  const typeParam = searchParams.type;
  const initialType =
    typeParam === "requirement" || typeParam === "service" ? typeParam : "offer";
  if (!isSupabaseConfigured()) redirect("/marketplace");
  // No sign-in required to build and preview. The account comes at publish.
  const user = await getUser();

  // Edit mode: load the member's own listing and prefill the composer. An
  // edit is only offered to the signed-in owner; anything else falls back to a
  // fresh listing rather than leaking another member's draft.
  let editId: string | null = null;
  let initial: ListingInitial | null = null;
  if (searchParams.edit && user) {
    const supabase = createClient();
    const { data: row } = await supabase
      .from("listings")
      .select(
        "id, user_id, type, product, details, volume, quantity, unit, frequency, origin, destination, incoterm, submitter_role, chain_depth, payment_terms, validity_type, valid_until",
      )
      .eq("id", searchParams.edit)
      .eq("user_id", user.id)
      .maybeSingle();
    if (row) {
      const vol = parseVolume(row.volume);
      editId = row.id;
      initial = {
        type: (row.type as ListingType) ?? "offer",
        product: row.product ?? "",
        description: row.details ?? "",
        qty: row.quantity != null ? String(row.quantity) : vol.quantity ?? "",
        unit: row.unit ?? vol.unit ?? "MT",
        freq: row.frequency ?? "One-off",
        origin: row.origin ?? "",
        destination: row.destination ?? "",
        incoterm: row.incoterm ?? "To discuss",
        role: row.submitter_role ?? "",
        chain: row.chain_depth ?? "",
        paymentTerms: row.payment_terms ?? "",
        validityMode: row.validity_type === "dated" ? "dated" : "standing",
        validUntil: row.valid_until ?? "",
      };
    }
  }

  return (
    <>
      <header className="container-px pt-14 pb-10 md:pt-20">
        <span className="pill">{t("new.pill")}</span>
        <h1
          className="serif text-white mt-6 mb-5 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.02, letterSpacing: "-0.015em" }}
        >
          {t("new.heading")}
        </h1>
        <p className="text-[16px] text-gray-2 leading-relaxed max-w-2xl">
          {t("new.intro")}
        </p>
      </header>

      <section className="container-px pb-24">
        <div className="max-w-2xl">
          <ListingForm
            initialType={initial?.type ?? initialType}
            isAuthed={Boolean(user)}
            restoreDraft={searchParams.restore === "1"}
            editId={editId}
            initial={initial}
          />
        </div>
      </section>
    </>
  );
}
