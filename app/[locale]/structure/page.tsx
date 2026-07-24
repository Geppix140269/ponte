import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isRtl, type Locale } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import StructureComposer from "@/components/structure/StructureComposer";
import "@/components/find/find.css";
import "@/components/structure/structure.css";

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
export default async function StructurePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <div className={landingFontVars} dir={isRtl(params.locale) ? "rtl" : "ltr"}>
      <StructureComposer />
    </div>
  );
}
