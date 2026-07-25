import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { alternatesFor } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import LegalPage from "@/components/legal/LegalPage";
import { PRIVACY } from "@/lib/legal/content";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return {
    title: PRIVACY.title,
    description:
      "How Ponte Trade collects, uses, and protects personal data, in line with UK GDPR.",
    alternates: alternatesFor("/privacy", params.locale),
  };
}

/**
 * Privacy Policy, box-free in the Brand v5 heritage-light style. Copy is the
 * confirmed 2026-07-25 draft, served from lib/legal/content and pending
 * solicitor review.
 */
export default function PrivacyPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return <LegalPage doc={PRIVACY} />;
}
