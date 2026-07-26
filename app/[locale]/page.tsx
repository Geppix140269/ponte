import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { landingFontVars } from "@/components/home/landing/fonts";
import { readMarketSignals } from "@/lib/board/market-signals";
import { toDeskRecord } from "@/lib/desk/adapter";
import { MARKET_FAMILIES, PRODUCT_SECTORS } from "@/lib/taxonomy/market";
import DeskShell from "@/components/desk/DeskShell";
import AskPonte from "@/components/desk/AskPonte";
import RecordCard from "@/components/desk/RecordCard";
import PonteFooter from "@/components/PonteFooter";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import "@/components/desk/desk.css";

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
 *   No measured sector counts. Every public signal in production currently
 *   carries a null HS code, so an HS-derived sector count would read zero on
 *   every sector while the market is demonstrably busy. The sector grid is
 *   therefore NAVIGATION and says so: "Browse by sector", captioned with the
 *   HS range each sector covers. It is deliberately not headed "Active
 *   sectors" or "Busiest sectors", and it prints no count. Issue #42 is the
 *   data defect; misrepresenting it here would not fix it.
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

/** How many signals the entrance shows before handing over to the listing. */
const LANDING_SIGNALS = 4;

export async function generateMetadata({ params }: { params: { locale: Locale } }) {
  return {
    title: "Ponte Trade",
    description:
      "Ponte reads named public trade sources and publishes what they say. Separately, members submit requirements and offers that Ponte reviews before publication. The two are never mixed.",
    alternates: alternatesFor("/", params.locale),
  };
}

const FAMILY_NOTE: Record<string, string> = {
  products: "15 HS sectors, chapters 01 to 97",
  services: "Freight, customs, inspection, finance",
  distribution: "Distributors, agents, market entry",
};

export default async function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  const board = await readMarketSignals(LANDING_SIGNALS);
  const records = board.state === "ok" ? board.signals.slice(0, LANDING_SIGNALS).map(toDeskRecord) : [];

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      {/* rail is omitted, not empty: no journey has started. */}
      <DeskShell rail={null}>
        <section className="hero">
          <div className="hero__top">
            <div>
              <p className="kicker">Cross-border trade in physical goods</p>
              <h1>
                Who is buying, who is selling, and <em>what can actually be established.</em>
              </h1>
              <p className="hero__p">
                Ponte reads named public trade sources and publishes what they say. Separately,
                buyers, manufacturers, distributors and trade-service providers submit
                requirements and offers that Ponte reviews before publication. The two are never
                mixed, and neither is ever presented as the other.
              </p>

              <div className="fams">
                {MARKET_FAMILIES.map((family) => (
                  <Link key={family.key} href="/explore">
                    <PonteIcon name={family.icon} size={26} />
                    <b>{family.label}</b>
                    <span>{FAMILY_NOTE[family.key]}</span>
                  </Link>
                ))}
              </div>
            </div>

            <AskPonte placeholder="I mill refined sugar in Santos and want to find buyers in South Asia" />
          </div>

          <p className="norail mono">
            No journey has started, so no journey rail is shown. State an objective, or open a
            record, and the rail appears with the journey you are on.
          </p>
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

        {/* Navigation, not measurement. No count is printed, because every
            public signal in production currently carries a null HS code and a
            count derived from that would be a zero the market contradicts. */}
        <section className="sec">
          <div className="sech">
            <div>
              <h2>
                <PonteIcon name="market.family.products" size={18} />
                Browse by sector
              </h2>
              <p className="d">
                The HS taxonomy Ponte classifies products against. These are the sectors the
                market is organised into, not a measure of what is active in them. Chapters 71 and
                91 to 92 belong to no sector and are reported rather than hidden.
              </p>
            </div>
          </div>
          <div className="sectors">
            {PRODUCT_SECTORS.map((sector, i) => (
              <Link key={sector.key} href={`/explore?sector=${i}`}>
                <PonteIcon name={sector.icon} size={22} />
                <b>{sector.label}</b>
                <span>{sector.range}</span>
              </Link>
            ))}
          </div>
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
