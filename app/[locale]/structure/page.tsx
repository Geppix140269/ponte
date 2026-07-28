import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isRtl, type Locale } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import StructureComposer from "@/components/structure/StructureComposer";
import { categoryIcons } from "@/components/ponte/category/CategoryIcons";
import { entranceFromParams } from "@/lib/desk/entrances";
import "@/components/find/find.css";
import "@/components/structure/structure.css";
// Category-first classification (ADR-0011) for services and distribution.
import "@/components/ponte/category/category.css";
// The approved Bridge stylesheet, imported unmodified, then the integration
// additions. Same order and same two files as the landing, because the product
// intake (ADR-0012) uses the same approved primitive rather than a local variant.
import "@/design/authority/bridge/v1/source/ponte-bridge.css";
import "@/components/ponte/bridge/bridge-integration.css";
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
  searchParams?: { family?: string; intent?: string };
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

  return (
    <div className={landingFontVars} dir={isRtl(params.locale) ? "rtl" : "ltr"}>
      {/* The category icons are rendered here, on the server, and handed to
          the client composer as nodes. PonteIcon stays the one renderer and
          the registry's markup never reaches the browser bundle. */}
      <StructureComposer entrance={entrance} icons={categoryIcons()} />
    </div>
  );
}
