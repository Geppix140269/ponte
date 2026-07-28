import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { landingFontVars } from "@/components/home/landing/fonts";
import { readMarketSignals } from "@/lib/board/market-signals";
import { toDeskRecord } from "@/lib/desk/adapter";
import DeskShell from "@/components/desk/DeskShell";
import RecordCard from "@/components/desk/RecordCard";
import SignalStrip from "@/components/desk/SignalStrip";
import PonteFooter from "@/components/PonteFooter";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import LandingBridges from "@/components/ponte/bridge/LandingBridges";
import { landingFamilies } from "@/lib/landing/families";
import "@/components/desk/desk.css";
// The approved Bridge stylesheet, imported from the authority package rather
// than copied into the product. There is one source for the geometry, and a
// change to it is a change to the authority, which is what CODEOWNERS protects.
import "@/design/authority/bridge/v1/source/ponte-bridge.css";
import "@/components/ponte/bridge/bridge-integration.css";

/**
 * The entrance, in The Desk.
 *
 * It has NO journey rail, and that is the design, not an omission. Nothing has
 * started, so there is no position to show; a rail here would tell a first-time
 * visitor they are somewhere in a process they have not begun. The rail appears
 * the moment a journey does, one click away.
 *
 * Three rules govern what this page is allowed to say, and all three cost the
 * composition something:
 *
 *   No manufactured activity. The prototype carried a "market pulse" strip of
 *   four live measures. Not one of them has a production query behind it, so
 *   the strip is omitted rather than filled with the prototype's numbers. A
 *   figure on the entrance is a claim about the market, and Ponte does not make
 *   one it cannot answer for.
 *
 *   No large empty reviewed-record state. Zero listings currently pass the
 *   publication contract, so the Qualified Opportunities section is omitted
 *   rather than shown as an empty promise, and the market activity that does
 *   exist carries the page.
 *
 * The two record classes stay separate in language, treatment and section. A
 * Market Signal is never called a Qualified Opportunity, and the dashed slate
 * rule on a signal card is never applied to a reviewed record.
 */

export const dynamic = "force-dynamic";

/** How many signals the entrance shows as records before the full board. */
const LANDING_SIGNALS = 4;
/** How many the live strip carries. Enough to move; all of them real. */
const STRIP_SIGNALS = 14;

export async function generateMetadata({ params }: { params: { locale: Locale } }) {
  return {
    title: "Ponte Trade",
    description:
      "Ponte reads named public trade sources and publishes what they say. Separately, members submit requirements and offers that Ponte reviews before publication. The two are never mixed.",
    alternates: alternatesFor("/", params.locale),
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  const board = await readMarketSignals(STRIP_SIGNALS);
  const live = board.state === "ok" ? board.signals.map(toDeskRecord) : [];
  const records = live.slice(0, LANDING_SIGNALS);

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      {/* rail is omitted, not empty: no journey has started. */}
      <DeskShell rail={null}>
        {/* Directly below the navigation. Real records only: when the read
            returns nothing the strip renders nothing rather than a placeholder. */}
        <SignalStrip records={live} />

        <section className="hero">
          <div className="hero__top">
            <div>
              <p className="kicker">Ponte Trade</p>
              {/* Constitution v1 section 5 and bridge/v1/APPROVAL.md both name this
                  exact structure. The emphasis is one deliberate differentiated
                  phrase, in approved serif italic and the AA-safe gold text
                  token, and it is the only emphasis in the heading. */}
              <h1>
                Global trade, from <em>signal to deal.</em>
              </h1>
              <p className="hero__p">
                Find market signals, post opportunities, offer trade services and find
                distribution partners.
              </p>

              {/* The approved Family Bridge, and the Action Bridge it reveals.
                  Every family is actionable: a family with no externally
                  observed inventory is still a market a member can enter by
                  creating a record, so Trade services and Distribution carry
                  the same weight of action as Products.

                  The destinations are not built here. `marketEntrances()`
                  derives them from the canonical taxonomy, exactly as the
                  replaced grid did, so every route and query string is the one
                  that shipped before. */}
              <LandingBridges families={landingFamilies()} />
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="sech">
            <div>
              <h2>
                <PonteIcon name="evidence.evreview" size={18} />
                Market Signals
              </h2>
              <p className="d">
                Indications read from named public sources. Nothing here has been confirmed with
                the party named in it, and nobody behind one is a Ponte member.
              </p>
            </div>
            <Link href="/market-signals">
              All Market Signals<span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>

          {board.state === "unavailable" ? (
            <div className="err">
              <PonteIcon name="participation.boundary" size={20} label="Boundary of what is known" />
              <div>
                <b>The sources could not be read</b>
                <p>
                  A technical failure, not a finding. It does not mean nothing was published. The
                  board itself will say what is live once the read succeeds.
                </p>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="empty">
              <PonteIcon name="participation.boundary" size={24} label="Boundary of what is known" />
              <div>
                <b>No signal is currently live on the public board</b>
                <p>
                  A signal is published only while it is approved and inside its ninety-day public
                  life. Nothing found is not the same as nothing happening.
                </p>
                <div className="empty__a">
                  <Link className="b" href="/structure">
                    Bring a requirement or offer to the desk
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            records.map((record) => <RecordCard key={record.ref} record={record} />)
          )}
        </section>

        <section className="sec">
          <div className="panel" style={{ borderColor: "var(--rule-strong)" }}>
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
                <Link className="b b--2 b--lg" href="/about">
                  How review works
                </Link>
              </div>
            </div>
          </div>
        </section>
      </DeskShell>

      <PonteFooter />
    </div>
  );
}
