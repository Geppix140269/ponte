import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import {
  searchSignalInventory,
  countSignalInventory,
  signalFamilyAvailability,
  countSignalsClassifiedOn,
} from "@/lib/board/inventory";
import { axisForFamily } from "@/lib/board/availability";
import { railForScreen } from "@/lib/desk/journey";
import { alternatesFor } from "@/lib/seo";
import DeskShell from "@/components/desk/DeskShell";
import SignalBoard from "@/components/desk/SignalBoard";
import { parseFindQuery, toInventoryQuery, effectiveSort, PAGE_SIZE } from "@/lib/find/query";
import "@/components/desk/desk.css";
import "@/components/ponte/category/category.css";

/**
 * R-FIND station 2, Discover: the Market Signals route.
 *
 * This file is now the data half and nothing else: read the query out of the
 * URL, ask the inventory for the matching page, hand both to `SignalBoard`.
 * Everything a member sees lives in that component, so the development
 * evidence gallery can render the same markup over fixtures. See its header
 * for why that separation exists.
 *
 * The search, the filters, the count, the ordering and the page are all
 * decided here from the URL and applied at the database over the complete
 * eligible table. None of them is a filter over the sixty records that came
 * back, which was the defect ADR-0011 exists to correct.
 *
 * The objective, when one was stated on the landing, is carried verbatim to the
 * command bar and marks the Objective station taken. When none was stated the
 * station reports that honestly rather than claiming a step nobody took.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  return {
    title: "Market Signals",
    description:
      "Indications read from named public sources. Ponte has not confirmed them with any party named in them.",
    alternates: alternatesFor("/market-signals", params.locale),
  };
}

export default async function MarketSignalsPage({
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

  // The board is now a search. The free text and the filters are both applied
  // in the query over the complete table, the count is a count of that whole
  // matching set rather than of the page that came back, and the page is one
  // window onto it rather than the end of it.
  const q = parseFindQuery(searchParams ?? {});
  /*
   * One clock for every read in this render.
   *
   * The eligibility predicate compares against a timestamp, so four reads taking
   * four `now()` values could disagree about a signal expiring between them:
   * the board would show a record the availability count had already dropped.
   */
  const nowIso = new Date().toISOString();
  /*
   * Which controls exist is a measurement, not a taxonomy.
   *
   * Issued alongside the search rather than after it, so offering a filter
   * costs latency once and not twice. `axisClassified` is only asked when a
   * family is selected, because it only decides whether that family's own
   * category list is drawn.
   */
  const [board, everything, availability, axisClassified] = await Promise.all([
    searchSignalInventory(toInventoryQuery(q), {
      limit: PAGE_SIZE,
      offset: (q.page - 1) * PAGE_SIZE,
      sort: effectiveSort(q),
      nowIso,
    }),
    countSignalInventory(nowIso),
    signalFamilyAvailability(nowIso),
    q.family ? countSignalsClassifiedOn(axisForFamily(q.family), q.family, nowIso) : Promise.resolve(null),
  ]);
  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={rail} current="market" objective={objective}>
        <SignalBoard
          q={q}
          board={board}
          everything={everything}
          availability={availability}
          axisClassified={axisClassified}
        />

        <section className="sec">
          <div className="panel">
            <div className="closing">
              <div>
                <h2 className="serif">Bring a requirement, an offer or a service to the desk.</h2>
                <p>
                  Write it in your own words. Ponte structures it, shows exactly what will be
                  public, private and reviewer-only, and reviews it before anything is published.
                </p>
              </div>
              <div className="closing__a">
                <Link className="b b--lg" href="/structure">
                  Start a deal
                </Link>
              </div>
            </div>
          </div>
        </section>
      </DeskShell>
    </div>
  );
}
