import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import { signalCategorySplits } from "@/lib/board/inventory";
import { railForScreen } from "@/lib/desk/journey";
import { alternatesFor } from "@/lib/seo";
import DeskShell from "@/components/desk/DeskShell";
import CategoryBrowse from "@/components/desk/CategoryBrowse";
import "@/components/desk/desk.css";
import "@/components/ponte/category/category.css";

/**
 * The Market Signals category browse.
 *
 * The third way into the inventory, beside the two doors and the search: a
 * member who knows their market but not their words. Every market listed is one
 * the live inventory actually carries, measured rather than declared, so the
 * page cannot offer a category that returns nothing.
 *
 * The data half only — everything a member sees is `CategoryBrowse`, for the
 * same reason the board is split from its route: the markup can then be
 * rendered over fixtures without a database.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  return {
    title: "Market Signals — markets",
    description:
      "Every market carrying a live Market Signal, and how each one splits between buyer requirements and seller offers.",
    alternates: alternatesFor("/market-signals/categories", params.locale),
  };
}

export default async function MarketSignalCategoriesPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  setRequestLocale(params.locale);

  const objectiveRaw = searchParams?.objective;
  const objective =
    (typeof objectiveRaw === "string" ? objectiveRaw.trim() : "") || null;
  const rail = railForScreen("listing", { objectiveStated: Boolean(objective) });

  const splits = await signalCategorySplits();

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={rail} current="market" objective={objective}>
        <CategoryBrowse splits={splits} />
      </DeskShell>
    </div>
  );
}
