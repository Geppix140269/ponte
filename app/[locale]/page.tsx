import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { landingFontVars } from "@/components/home/landing/fonts";
import { readMarketSignals } from "@/lib/board/market-signals";
import { toDeskRecord } from "@/lib/desk/adapter";
import DeskShell from "@/components/desk/DeskShell";
import SignalStrip from "@/components/desk/SignalStrip";
import PonteFooter from "@/components/PonteFooter";
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

  // Only the strip reads now. `signalSideCounts()` went with the crossing it
  // fed: counting both sides of the whole table on every landing render, for a
  // graphic the landing no longer draws, is a database round trip spent on
  // nothing.
  const board = await readMarketSignals(STRIP_SIGNALS);
  const live = board.state === "ok" ? board.signals.map(toDeskRecord) : [];

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

        {/*
          The Market Signals crossing is gone from the landing, by owner
          decision on 31 July 2026.

          It drew the demand/supply crossing with its two live counts. The
          drawing is not wrong, it is premature: the landing's one question is
          which family you are in, and the same crossing is drawn one step
          later inside Explore, where a member has already said Products and
          the two sides mean something specific to them. Asking the
          demand-or-supply question before the family question put the second
          question first.

          So it is removed here rather than duplicated. `/market-signals` and
          Explore still draw it, and the family crossing above is now the only
          thing the landing asks.
        */}

        {/*
          The closing band is gone, by owner decision on 31 July 2026.

          It read "Bring a requirement, an offer or a service to the desk" over
          a Start a deal and a How review works control. It stated the platform
          as three things a member brings to a desk, which is not what Ponte is:
          the three canonical families are Products, Trade services, and
          Distribution and representation, and "requirement, offer or service"
          names neither the families nor the seven intents under them. The band
          therefore taught a model the product does not have, at the last thing
          a reader saw on the page.

          Nothing replaces it. The family crossing above is already the route
          in, and a second entrance restating it in different words is how the
          two drifted apart in the first place.
        */}
      </DeskShell>

      <PonteFooter />
    </div>
  );
}
