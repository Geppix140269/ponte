import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRtl, type Locale } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import CheckComposer from "@/components/check/CheckComposer";
import { COST_VERIFICATION_L2 } from "@/lib/credits";
import "@/components/find/find.css";
import "@/components/check/verify.css";

export const dynamic = "force-dynamic";

const CHECK_JOURNEY_ON = process.env.NEXT_PUBLIC_CHECK_JOURNEY === "on";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return {
    title: "Check a company",
    description:
      "Check or verify a company against named sources and receive a dated evidence receipt, never a score.",
    robots: { index: false, follow: false },
  };
}

/**
 * Check & Verify (Journey 3). A thin server shell: it gates on the feature flag
 * (off -> notFound, which is the journey's safe-disable), sets the locale,
 * publishes the editorial fonts, and mounts the client composer. The composer
 * owns the K01-K09 stack, the purpose fork, the account/credits gate and the
 * dated evidence receipt. ChromeGate drops the app's obsidian chrome here.
 */
export default function CheckPage({ params }: { params: { locale: string } }) {
  if (!CHECK_JOURNEY_ON) notFound();
  setRequestLocale(params.locale);
  return (
    <div className={`ponte-find ${landingFontVars}`} dir={isRtl(params.locale) ? "rtl" : "ltr"}>
      <CheckComposer cost={COST_VERIFICATION_L2} />
    </div>
  );
}
