import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import BridgeSpecimen from "@/components/bridge/BridgeSpecimen";
import { bridgeFontVars } from "@/components/bridge/fonts";
import "@/design-system/bridge/tokens.css";
import "@/design-system/bridge/bridge.css";

/**
 * The bridge system, on a sheet, so it can be LOOKED at.
 *
 * Phase 1 changes nothing a member can reach: `/dev/*` 404s in production, and
 * `ChromeGate` already bares it so the specimen is not framed by the chrome it
 * is replacing. Every route in the product still renders exactly as it did.
 *
 * This exists because a design system described in a commit message is a claim.
 * The three sizes of arc beside each other, the tape running and stopping, the
 * two shells at the breakpoint, and the same page in five scripts are things
 * that are either right or wrong on sight, and there is no other way to tell.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  setRequestLocale(params.locale);
  return { title: "The bridge system", robots: { index: false, follow: false } };
}

export default function BridgeSpecimenPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <div className={bridgeFontVars}>
      <BridgeSpecimen />
    </div>
  );
}
