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

type Deal = {
  id: string;
  ref: string;
  type: string;
  product: string;
  origin: string | null;
  destination: string | null;
  volume: string | null;
  incoterm: string | null;
  details: string;
};

// Public, shareable page for ONE approved listing. This is the link members
// forward on WhatsApp: OG tags carry the product photo and teaser, and the
// page converts visitors into members. Anything not approved 404s.
async function getDeal(ref: string): Promise<{ deal: Deal; image: string | null } | null> {
  if (!isSupabaseConfigured()) return null;
  const adminSb = createAdminClient();
  const { data } = await adminSb
    .from("listings")
    .select("id, ref, type, product, origin, destination, volume, incoterm, details")
    .eq("ref", ref.toUpperCase())
    .eq("status", "approved")
    .maybeSingle();
  if (!data) return null;

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
  return { deal: data as Deal, image };
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
  const locale = await getLocale();

  const res = await getDeal(params.ref);
  if (!res) notFound();
  const { deal, image } = res;
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
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={deal.product}
              className="mb-6 h-64 w-full rounded-xl object-cover"
            />
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="mono text-[12px] text-gold">{deal.ref}</span>
            <span className="badge uppercase">{typeLabel(t, deal.type)}</span>
          </div>
          <p className="mono mt-3 text-[12px] leading-relaxed text-gray-2">
            {[
              deal.origin && t("card.origin", { value: deal.origin }),
              deal.destination && t("card.destination", { value: deal.destination }),
              deal.volume,
              deal.incoterm,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-gray-2">
            {user ? shownDetails : teaser(shownDetails)}
            {!user && (
              <span className="ml-2 text-gold">{t("detail.signInToRead")}</span>
            )}
          </p>

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
