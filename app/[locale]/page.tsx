import { getTranslations, setRequestLocale } from "next-intl/server";
import { isRtl, type Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import PonteLanding from "@/components/home/landing/PonteLanding";
import { landingFontVars } from "@/components/home/landing/fonts";
import "@/components/home/landing/landing.css";

/**
 * The public entrance to Ponte Trade: the "What's your deal?" gateway from the
 * v1.1 design handoff.
 *
 * This page is a thin server shell. It sets the locale, produces metadata, and
 * mounts the interactive composition inside a single .ponte-landing wrapper that
 * scopes the Brand v5 heritage-light tokens locally, so the cream/gold editorial
 * page never disturbs the rest of the (obsidian) application. The interaction,
 * voice, multilingual rotation and intent routing live in PonteLanding.
 *
 * The shared dark site chrome (header, footer, bottom bar) is hidden on this
 * route by ChromeGate in the locale layout, so the page renders full-bleed with
 * its own header and trust-line footer, as the design intends.
 */

export async function generateMetadata({ params }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale: params.locale, namespace: "home" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor("/", params.locale),
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <div className={`ponte-landing ${landingFontVars}`}>
      <PonteLanding locale={params.locale} rtl={isRtl(params.locale)} />
    </div>
  );
}
