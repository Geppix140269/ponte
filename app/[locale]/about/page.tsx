import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { alternatesFor } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import LegalPage from "@/components/legal/LegalPage";
import { ABOUT } from "@/lib/legal/content";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return {
    title: ABOUT.title,
    description: ABOUT.lead,
    alternates: alternatesFor("/about", params.locale),
  };
}

/**
 * What Ponte is, box-free in the Brand v5 heritage-light style. Copy is the
 * confirmed 2026-07-25 draft, served from lib/legal/content.
 */
export default function AboutPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return <LegalPage doc={ABOUT} />;
}
