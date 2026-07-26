import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import { readMarketSignals } from "@/lib/board/market-signals";
import { toDeskRecord } from "@/lib/desk/adapter";
import { railForScreen } from "@/lib/desk/journey";
import { alternatesFor } from "@/lib/seo";
import DeskShell from "@/components/desk/DeskShell";
import FactRegister from "@/components/desk/FactRegister";
import RecordCard from "@/components/desk/RecordCard";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import "@/components/desk/desk.css";

/**
 * R-FIND station 2, Discover: the Market Signals listing, in The Desk.
 *
 * Two presentations of one record set, chosen by density and nothing else:
 * above six records the ruled fact register (the Ledger borrowing) is faster to
 * scan than six raised cards; at or below six the cards are more readable than
 * a register with almost nothing in it. Both read their facts from `factsFor`,
 * so the two forms can never disagree about which facts a record shows.
 *
 * Four states, all of them real and none of them merged:
 *
 *   default      approved, unexpired signals, newest read first
 *   loading      handled by loading.tsx, which holds the register's own
 *                column widths so the page does not reflow when rows arrive
 *   empty        Ponte read the sources and this set is genuinely empty
 *   error        Ponte could not read the sources, which is a technical
 *                failure and not a finding
 *
 * The last two are the reason this route reads `readMarketSignals` rather than
 * `getMarketSignals`: the array collapses both into nothing, and telling a
 * member "nothing was found" when the truth is "nothing could be read" is
 * Ponte reporting a finding it never made.
 *
 * The objective, when one was stated on the landing, is carried verbatim to the
 * command bar and marks the Objective station taken. When none was stated the
 * station reports that honestly rather than claiming a step nobody took.
 */

export const dynamic = "force-dynamic";

/** Above this many records the register earns its rules. */
const REGISTER_THRESHOLD = 6;

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

function Intro() {
  return (
    <div className="sech">
      <div>
        <h2>
          <PonteIcon name="evidence.evreview" size={18} />
          Market Signals
        </h2>
        <p className="d">
          Read from named public sources. Nothing here has been confirmed with the party named in
          it, and nothing here is a Ponte member. Sorted by the date Ponte read the source.
        </p>
      </div>
    </div>
  );
}

export default async function MarketSignalsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { objective?: string };
}) {
  setRequestLocale(params.locale);

  const objective = searchParams?.objective?.trim() || null;
  const rail = railForScreen("listing", { objectiveStated: Boolean(objective) });
  const board = await readMarketSignals();
  const records = board.state === "ok" ? board.signals.map(toDeskRecord) : [];

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={rail} current="market" objective={objective}>
        <section className="sec">
          <Intro />

          {board.state === "unavailable" ? (
            <div className="err">
              <PonteIcon name="participation.boundary" size={20} label="Boundary of what is known" />
              <div>
                <b>The sources could not be read</b>
                <p>
                  This is a technical failure, not a finding. It does not mean nothing was
                  published, and it does not mean the market is quiet. Ponte cannot show you what
                  is live until the read succeeds.
                </p>
                <div className="empty__a">
                  <Link className="b" href="/market-signals">
                    Try the read again
                  </Link>
                  <Link className="b b--2" href="/explore">
                    Explore the market instead
                  </Link>
                </div>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="empty">
              <PonteIcon name="participation.boundary" size={24} label="Boundary of what is known" />
              <div>
                <b>No signal is currently live on the public board</b>
                <p>
                  Ponte publishes a signal only while it is approved and inside its public life.
                  Nothing found is not the same as nothing happening: sources publish late, a
                  signal leaves the board ninety days after it was read, and some buying is never
                  published at all.
                </p>
                <div className="empty__a">
                  <Link className="b" href="/structure">
                    Bring a requirement or offer to the desk
                  </Link>
                  <Link className="b b--2" href="/explore">
                    Explore the market
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="mono" style={{ fontSize: 11, color: "var(--ink-3)", paddingBottom: 10 }}>
                {records.length === 1 ? "1 signal" : `${records.length} signals`}
                {records.length > REGISTER_THRESHOLD ? ", fact register" : ", record cards"}
              </p>

              {records.length > REGISTER_THRESHOLD ? (
                <FactRegister records={records} label="Market Signals" />
              ) : (
                <div>
                  {records.map((record) => (
                    <RecordCard key={record.ref} record={record} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

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
