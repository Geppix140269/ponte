import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { alternatesFor } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import LegalPage from "@/components/legal/LegalPage";
import { TERMS } from "@/lib/legal/content";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return {
    title: TERMS.title,
    description:
      "The terms that govern your use of Ponte Trade, operated by 1402 CELSIUS LTD.",
    alternates: alternatesFor("/terms", params.locale),
  };
}

/**
 * Terms of Service, box-free in the Brand v5 heritage-light style. Copy is the
 * confirmed 2026-07-25 draft (including the AI-system clause), served from
 * lib/legal/content and pending solicitor review.
 */
export default function TermsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return <LegalPage doc={TERMS} />;
}
