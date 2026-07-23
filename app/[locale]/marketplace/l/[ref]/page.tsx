import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Share2, ShieldCheck } from "lucide-react";
import { getUser, isSupabaseConfigured } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import InterestButton from "@/components/InterestButton";
import { translateListing } from "@/lib/ai-vet";
import { alternatesFor } from "@/lib/seo";
import {
  corridorEnd,
  extractTiming,
  formatPosted,
  formatQuantity,
  labelFor,
  parseVolume,
  verificationKey,
  CHAIN_KEYS,
  FREQUENCY_KEYS,
  ROLE_KEYS,
  TIMING_KEYS,
  UNIT_KEYS,
} from "@/lib/listing-terms";
import { isPubliclyCurrent } from "@/lib/listings/validity";
import { isPubliclyEligibleVerification } from "@/lib/listings/publication-gate";
import { truthfulLabels } from "@/lib/listings/public-labels";
import type { Locale } from "@/i18n/routing";

// Languages a reader can flip the listing into. Each listing/language pair
// is translated once by AI and cached in listing_translations.
const LANGS: { code: string; label: string }[] = [
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

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ponte.trade";

type DeskVersion = { qualification?: string | null; limitations?: string | null } | null;

type Deal = {
  id: string;
  user_id: string;
  ref: string;
  type: string;
  product: string;
  hs_code: string | null;
  origin: string | null;
  destination: string | null;
  volume: string | null;
  quantity: number | null;
  unit: string | null;
  frequency: string | null;
  incoterm: string | null;
  payment_terms: string | null;
  submitter_role: string | null;
  chain_depth: string | null;
  mandate_sighted: boolean | null;
  validity_type: string | null;
  valid_until: string | null;
  reconfirmed_at: string | null;
  decided_at: string | null;
  desk_version: DeskVersion;
  details: string;
  created_at: string;
};

// Public, shareable page for ONE approved listing. This is the link members
// forward on WhatsApp: OG tags carry the product photo and teaser, and the
// page converts visitors into members. Anything not approved, or expired, 404s.
async function getDeal(
  ref: string,
): Promise<{
  deal: Deal;
  image: string | null;
  trustLevel: number | null;
  businessVerified: boolean;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const adminSb = createAdminClient();
  const { data } = await adminSb
    .from("listings")
    .select(
      "id, user_id, ref, type, product, hs_code, origin, destination, volume, quantity, unit, frequency, incoterm, payment_terms, submitter_role, chain_depth, mandate_sighted, validity_type, valid_until, reconfirmed_at, decided_at, desk_version, details, created_at",
    )
    .eq("ref", ref.toUpperCase())
    .eq("status", "approved")
    .maybeSingle();
  if (!data) return null;

  // Not-current opportunities are not public: a passed finite validity OR a
  // lapsed 90-day reconfirmation both 404 the link. Same rule the board and the
  // homepage showcase apply.
  if (!isPubliclyCurrent(data)) return null;

  const { data: media } = await adminSb
    .from("listing_media")
    .select("path, kind")
    .eq("listing_id", data.id)
    .eq("kind", "image")
    .order("created_at", { ascending: true })
    .limit(1);
  const image = media?.[0]
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-media/${media[0].path}`
    : null;

  // The counterparty stays anonymous. Their verification level does not
  // identify them, and it is the fact that decides whether to spend time here.
  // No answer means unknown, which is not the same as unverified, so the
  // badge is left off rather than made up. business_verification_id is the
  // bound member-business record from Block B: its presence is what makes
  // "Business checked" a true statement rather than a decoration.
  const { data: profile } = await adminSb
    .from("profiles")
    .select("verification_level, business_verification_id")
    .eq("id", data.user_id)
    .maybeSingle();

  // Continuing verification currency: an approved listing drops off the public
  // surfaces when its owner's member-business verification is no longer passing
  // (suspended, failed, dropped below the member level, or no longer bound). It
  // 404s here for the same reason it vanishes from the board.
  let verification: { purpose: string | null; status: string | null } | null = null;
  if (profile?.business_verification_id) {
    const { data: v } = await adminSb
      .from("verifications")
      .select("purpose, status")
      .eq("id", profile.business_verification_id)
      .maybeSingle();
    verification = v ?? null;
  }
  const ownerEligible = isPubliclyEligibleVerification({
    verificationLevel: profile ? Number(profile.verification_level ?? 0) : null,
    business_verification_id: profile?.business_verification_id ?? null,
    verification,
  });
  if (!ownerEligible) return null;

  return {
    deal: data as Deal,
    image,
    trustLevel: profile ? Number(profile.verification_level ?? 0) : null,
    businessVerified: ownerEligible,
  };
}

function teaser(details: string, max = 160): string {
  return details.length > max ? details.slice(0, max) + "…" : details;
}

// Listing types are a short database enum. Unknown values fall back to the
// raw value rather than rendering a missing key.
function typeLabel(t: (key: string) => string, type: string): string {
  return type === "offer" || type === "requirement" || type === "service"
    ? t(`type.${type}`)
    : type;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; ref: string };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "marketplace",
  });
  const res = await getDeal(params.ref);
  if (!res) return { title: t("detail.meta.notFound") };
  const { deal, image } = res;
  const title = `${deal.product} · ${deal.ref}`;
  const description = t("detail.meta.description", {
    type: typeLabel(t, deal.type),
    teaser: teaser(deal.details, 120),
  });
  return {
    title,
    description,
    alternates: alternatesFor(`/marketplace/l/${params.ref}`, params.locale),
    openGraph: {
      title: `${title} · Ponte`,
      description,
      url: `${APP_URL}/marketplace/l/${deal.ref}`,
      siteName: "Ponte",
      type: "website",
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${title} · Ponte`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

// Read an already cached translation. Nothing is generated here, so this is
// safe to call on a page load the reader did not ask for.
async function cachedTranslation(
  listingId: string,
  lang: string,
): Promise<{ product: string; details: string } | null> {
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
async function getTranslation(
  deal: Deal,
  lang: string,
): Promise<{ product: string; details: string } | null> {
  const adminSb = createAdminClient();
  const cached = await cachedTranslation(deal.id, lang);
  if (cached) return cached;

  const fresh = await translateListing(
    { product: deal.product, details: deal.details },
    lang,
  );
  if (!fresh) return null;
  await adminSb.from("listing_translations").insert({
    listing_id: deal.id,
    lang,
    product: fresh.product.slice(0, 300),
    details: fresh.details.slice(0, 4000),
  });
  return fresh;
}

export default async function DealPage({
  params,
  searchParams,
}: {
  params: { locale: string; ref: string };
  searchParams: { lang?: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("marketplace");
  // The option labels the member picked in the listing form, in the reader's
  // language. Same source, so the page cannot drift from the form.
  const tf = await getTranslations("listingForm");
  const locale = await getLocale();

  const res = await getDeal(params.ref);
  if (!res) notFound();
  const { deal, image, trustLevel, businessVerified } = res;
  const user = await getUser();

  // Optional reader language: the listing shown in THEIR language.
  // An explicit ?lang always wins. With no choice made, open the listing in
  // the current interface language when it has already been translated into
  // it; otherwise the original. ?lang=original pins the source wording.
  const requested = LANGS.some((l) => l.code === searchParams.lang)
    ? (searchParams.lang as string)
    : null;
  let lang = requested;
  let translation = requested ? await getTranslation(deal, requested) : null;
  if (!searchParams.lang && LANGS.some((l) => l.code === locale)) {
    const cached = await cachedTranslation(deal.id, locale);
    if (cached) {
      lang = locale;
      translation = cached;
    }
  }
  const shownProduct = translation?.product ?? deal.product;
  const shownDetails = translation?.details ?? deal.details;

  const shareText = `${t("detail.shareText", { product: deal.product, ref: deal.ref })}\n${APP_URL}/marketplace/l/${deal.ref}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  // ---- The trade terms, as a trader would ask for them ----------------
  // Timing is read out of the ORIGINAL details, never the translation: the
  // listing form writes that line in English on every listing.
  // Prefer the structured columns the composer now writes, falling back to the
  // legacy composed `volume` for listings that predate them. Nothing invented:
  // a value absent in both stays absent.
  const parsed = parseVolume(deal.volume);
  const vol = {
    ...parsed,
    quantity: deal.quantity != null ? String(deal.quantity) : parsed.quantity,
    quantityNumeric: deal.quantity != null ? Number(deal.quantity) : parsed.quantityNumeric,
    unit: deal.unit ?? parsed.unit,
    frequency: deal.frequency ?? parsed.frequency,
  };
  const from = corridorEnd(deal.origin);
  const to = corridorEnd(deal.destination);

  // The public trust labels, each shown only when the stored record supports
  // it (brief 5.1). "Opportunity reviewed" is true because this page only ever
  // renders an approved listing.
  const labels = truthfulLabels({
    businessVerified,
    submitterRole: deal.submitter_role,
    mandateSighted: Boolean(deal.mandate_sighted),
    reviewed: true,
    lastConfirmed: deal.reconfirmed_at ?? deal.decided_at ?? null,
  });
  const LABEL_TEXT: Record<string, string> = {
    businessChecked: "Business checked",
    roleDeclared: "Role declared",
    authoritySighted: "Authority sighted",
    opportunityReviewed: "Opportunity reviewed",
    lastConfirmed: "Last confirmed",
  };
  const deskQualification = deal.desk_version?.qualification?.trim() || null;
  const deskLimitations = deal.desk_version?.limitations?.trim() || null;
  const place = (end: { code: string | null; text: string | null }) =>
    end.text ? (end.code ? `${end.text} (${end.code})` : end.text) : null;

  const terms: { label: string; value: string | null; mono?: boolean }[] = [
    {
      label: t("detail.terms.quantity"),
      value: vol.quantity
        ? vol.quantityNumeric !== null
          ? formatQuantity(vol.quantityNumeric, locale)
          : vol.quantity
        : null,
      mono: true,
    },
    { label: t("detail.terms.unit"), value: labelFor(vol.unit, UNIT_KEYS, tf), mono: true },
    { label: t("detail.terms.incoterm"), value: deal.incoterm, mono: true },
    { label: t("detail.terms.origin"), value: place(from) },
    { label: t("detail.terms.destination"), value: place(to) },
    // Payment terms are now a structured column the composer writes. Still
    // honestly empty when the member did not state them.
    { label: t("detail.terms.payment"), value: deal.payment_terms },
    { label: t("detail.terms.hsCode"), value: deal.hs_code, mono: true },
    {
      label: t("detail.terms.frequency"),
      value: labelFor(vol.frequency, FREQUENCY_KEYS, tf),
    },
    {
      label: t("detail.terms.timing"),
      value: labelFor(extractTiming(deal.details), TIMING_KEYS, tf),
    },
    {
      label: t("detail.terms.role"),
      value: labelFor(deal.submitter_role, ROLE_KEYS, tf),
    },
    {
      label: t("detail.terms.chain"),
      value: labelFor(deal.chain_depth, CHAIN_KEYS, tf),
    },
    {
      label: t("detail.terms.posted"),
      value: formatPosted(deal.created_at, locale) || null,
      mono: true,
    },
  ];

  return (
    <>
      <header className="container-px pt-14 pb-8 md:pt-20">
        <span className="pill">{t("detail.pill")}</span>
        <h1
          className="serif text-white mt-6 mb-3 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(32px, 4.5vw, 54px)", lineHeight: 1.05, letterSpacing: "-0.015em" }}
        >
          {shownProduct}
        </h1>
        <p className="flex items-center gap-2 text-[13px] text-gray-2">
          <ShieldCheck className="h-4 w-4 text-gold" />
          {t("detail.assurance")}
        </p>
      </header>

      <section className="container-px pb-24">
        <div className="glass max-w-3xl p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span
              className="badge"
              style={
                deal.type === "offer"
                  ? { background: "var(--gold)", color: "#0D1B2A", fontWeight: 600 }
                  : deal.type === "requirement"
                    ? { border: "1px solid rgba(245,240,232,0.5)", color: "#F5F0E8" }
                    : { border: "1px solid rgba(255,255,255,0.18)", color: "#9CA3AF" }
              }
            >
              {typeLabel(t, deal.type)}
            </span>
            <span className="mono text-[12px] text-gold">{deal.ref}</span>
          </div>

          {/* The trade line: the same four facts the board row leads with. */}
          <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-3">
            <span className="flex flex-wrap items-baseline gap-x-2">
              {vol.quantity ? (
                <>
                  <span
                    className="mono tabular-nums text-cream"
                    style={{ fontSize: 30, letterSpacing: "-0.02em" }}
                  >
                    {vol.quantityNumeric !== null
                      ? formatQuantity(vol.quantityNumeric, locale)
                      : vol.quantity}
                  </span>
                  {vol.unit && (
                    <span className="mono text-[14px] text-gray-2">
                      {labelFor(vol.unit, UNIT_KEYS, tf)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[14px] text-gray-2/55">{t("notStated")}</span>
              )}
            </span>
            {deal.incoterm && (
              <span
                className="mono inline-flex items-center rounded-[6px] px-2.5 py-1 text-[13px] text-gold"
                style={{
                  background: "rgba(201,151,58,0.12)",
                  border: "1px solid rgba(201,151,58,0.4)",
                  letterSpacing: "0.06em",
                }}
              >
                {deal.incoterm}
              </span>
            )}
            <span
              dir="ltr"
              className="flex flex-wrap items-center gap-x-2 gap-y-1"
              title={[from.text, to.text].filter(Boolean).join(" > ")}
            >
              {from.code ? (
                <span className="mono text-[16px] text-cream">{from.code}</span>
              ) : from.text ? (
                <span className="text-[14px] text-cream">{from.text}</span>
              ) : (
                <span className="text-[12px] text-gray-2/55">{t("notStated")}</span>
              )}
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gold/70" />
              {to.code ? (
                <span className="mono text-[16px] text-cream">{to.code}</span>
              ) : to.text ? (
                <span className="text-[14px] text-cream">{to.text}</span>
              ) : (
                <span className="text-[12px] text-gray-2/55">{t("notStated")}</span>
              )}
            </span>
          </div>

          {/* Specification. Every term the desk holds, stated or not stated. */}
          <p
            className="mt-7 text-[10px] uppercase text-gray-2/70"
            style={{ letterSpacing: "0.18em" }}
          >
            {t("detail.terms.heading")}
          </p>
          <dl className="mt-1 grid grid-cols-2 gap-x-6 sm:grid-cols-3">
            {terms.map((row) => (
              <div key={row.label} className="border-t border-white/10 py-3">
                <dt
                  className="text-[10px] uppercase text-gray-2/70"
                  style={{ letterSpacing: "0.14em" }}
                >
                  {row.label}
                </dt>
                <dd
                  className={
                    row.value
                      ? `mt-1 text-[14px] leading-snug text-cream ${row.mono ? "mono tabular-nums" : ""}`
                      : "mt-1 text-[13px] leading-snug text-gray-2/55"
                  }
                >
                  {row.value ?? t("notStated")}
                </dd>
              </div>
            ))}
          </dl>

          {/* The public trust facts, each corresponding to stored data. No
              single ambiguous "verified": separate literal statements only. */}
          {labels.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
              {labels.map((l) => (
                <span
                  key={l.key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-[11px] uppercase text-cream"
                  style={{ letterSpacing: "0.12em" }}
                >
                  <ShieldCheck className="h-3 w-3 text-gold" />
                  {LABEL_TEXT[l.key]}
                  {l.key === "lastConfirmed" && l.date ? ` ${formatPosted(l.date, locale)}` : ""}
                </span>
              ))}
            </div>
          )}

          {/* Who is on the other side, to the extent it can be said. */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-4">
            {trustLevel !== null && (
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] uppercase ${trustLevel > 0 ? "text-cream" : "text-gray-2/70"}`}
                style={{ letterSpacing: "0.14em" }}
              >
                <ShieldCheck
                  className={`h-3.5 w-3.5 ${trustLevel > 0 ? "text-gold" : "text-gray-2/50"}`}
                />
                {t(verificationKey(trustLevel))}
              </span>
            )}
            <Link
              href="/verification"
              className="text-[12px] text-gold hover:text-cream"
            >
              {t("detail.verificationLink")}
            </Link>
          </div>

          {/* The desk-approved public text: what Ponte qualified, and the
              limitations that remain. Desk-written, not raw model output, and
              shown only when it exists. */}
          {(deskQualification || deskLimitations) && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-[10px] uppercase text-gray-2/70" style={{ letterSpacing: "0.18em" }}>
                Ponte review
              </p>
              {deskQualification && (
                <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-cream">
                  {deskQualification}
                </p>
              )}
              {deskLimitations && (
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-2">
                  {deskLimitations}
                </p>
              )}
            </div>
          )}

          <p className="mt-6 whitespace-pre-wrap text-[14px] leading-relaxed text-gray-2">
            {user ? shownDetails : teaser(shownDetails)}
            {!user && (
              <span className="ml-2 text-gold">{t("detail.signInToRead")}</span>
            )}
          </p>

          {image && (
            // The photo is context, not the decision. It sits under the terms.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={deal.product}
              className="mt-5 h-40 w-full rounded-xl object-cover md:w-2/3"
            />
          )}

          {/* Read it in your language */}
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-white/10 pt-4">
            <span className="text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.18em" }}>
              {t("detail.readIn")}
            </span>
            <Link
              href={`/marketplace/l/${deal.ref}?lang=original`}
              className={`text-[12px] ${!lang ? "text-gold" : "text-gray-2 hover:text-cream"}`}
            >
              {t("detail.original")}
            </Link>
            {LANGS.map((l) => (
              <Link
                key={l.code}
                href={`/marketplace/l/${deal.ref}?lang=${l.code}`}
                className={`text-[12px] ${lang === l.code ? "text-gold" : "text-gray-2 hover:text-cream"}`}
              >
                {l.label}
              </Link>
            ))}
            {lang && (
              <span className="w-full text-[11px] text-gray-2/70">
                {t("detail.machineTranslation")}
              </span>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {user ? (
              <InterestButton refCode={deal.ref} />
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/marketplace/l/${deal.ref}`)}`}
                className="btn-gold"
              >
                {t("detail.interested")} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost-light"
            >
              <Share2 className="h-4 w-4" /> {t("detail.shareWhatsApp")}
            </a>
          </div>
        </div>

        <div className="mt-8 max-w-3xl text-center md:text-left">
          <p className="text-[14px] text-gray-2">
            {t.rich("detail.footer", {
              link: (chunks) => (
                <Link href="/marketplace/new" className="text-gold hover:text-cream">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </section>
    </>
  );
}
