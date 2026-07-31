import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import SignalGates from "@/components/desk/SignalGates";
import CategoryBrowse from "@/components/desk/CategoryBrowse";
import { railForScreen } from "@/lib/desk/journey";
import type { SignalSideCounts, CategorySplit } from "@/lib/board/inventory";
import "@/components/desk/desk.css";
import "@/components/ponte/category/category.css";

/**
 * The Market Signals entrance and category browse, over a controlled inventory.
 *
 * Development only: it 404s in production, is not linked from anywhere, is not
 * in the sitemap and reads no database. Same gate and same purpose as
 * `/dev/market-signals-search`.
 *
 * Both surfaces are rendered by the SAME components the live routes render, so
 * a frame captured here is a frame of the shipped markup. Only the two reads
 * are replaced: `signalSideCounts` and `signalCategorySplits` become the
 * constants below.
 *
 * The numbers are a snapshot of production on 30 July 2026, kept as fixtures
 * rather than read live for the reason the search gallery gives: evidence that
 * depends on live rows stops being reproducible the moment a signal expires.
 *
 *   ?state=gates       the entrance (default)
 *   ?state=categories  the category browse
 *   ?state=unread      both reads failing, so the honest failure states show
 */

export const dynamic = "force-dynamic";

const COUNTS: SignalSideCounts = { requirement: 2498, offer: 2270, total: 4768 };

const SPLITS: CategorySplit[] = [
  { category: "Edible Oils", offers: 375, requirements: 171, total: 546 },
  { category: "Rice & Grains", offers: 367, requirements: 158, total: 525 },
  { category: "Nuts & Dried Fruit", offers: 332, requirements: 93, total: 425 },
  { category: "Coffee & Tea", offers: 292, requirements: 54, total: 346 },
  { category: "Spices & Ingredients", offers: 230, requirements: 88, total: 318 },
  { category: "Pulses", offers: 155, requirements: 76, total: 231 },
  { category: "Machinery, Components & Industrial", offers: 18, requirements: 211, total: 229 },
  { category: "Consumer Goods", offers: 8, requirements: 218, total: 226 },
  { category: "Energy & Fuels", offers: 51, requirements: 161, total: 212 },
  { category: "Metal Scraps & Recyclables", offers: 19, requirements: 187, total: 206 },
  { category: "Construction Materials", offers: 10, requirements: 179, total: 189 },
  { category: "Specialised Polymers & Packaging", offers: 60, requirements: 115, total: 175 },
  { category: "Chemicals", offers: 43, requirements: 115, total: 158 },
  { category: "Electronics", offers: 26, requirements: 109, total: 135 },
  { category: "Fresh & Processed Produce", offers: 69, requirements: 64, total: 133 },
  { category: "Metals (Other, Non-Scrap)", offers: 30, requirements: 89, total: 119 },
  { category: "Automotive & Vehicle Parts", offers: 12, requirements: 102, total: 114 },
  { category: "Processed Food Ingredients", offers: 44, requirements: 55, total: 99 },
  { category: "Textiles & Apparel", offers: 46, requirements: 42, total: 88 },
  { category: "Technology Products", offers: 25, requirements: 48, total: 73 },
  { category: "Healthcare & Medical", offers: 6, requirements: 48, total: 54 },
  { category: "Oilseeds", offers: 34, requirements: 14, total: 48 },
];

export default function MarketSignalsEntranceGallery({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  setRequestLocale(params.locale);

  const raw = searchParams?.state;
  const state = typeof raw === "string" ? raw : "gates";
  const rail = railForScreen("listing", { objectiveStated: false });

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={rail} current="market" objective={null}>
        {state === "categories" && <CategoryBrowse splits={SPLITS} />}
        {state === "unread" && (
          <>
            <SignalGates counts={null} />
            <CategoryBrowse splits={null} />
          </>
        )}
        {state !== "categories" && state !== "unread" && <SignalGates counts={COUNTS} />}
      </DeskShell>
    </div>
  );
}
