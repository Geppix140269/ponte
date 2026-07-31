import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { landingFontVars } from "@/components/home/landing/fonts";
import { getMarketSignal, type MarketSignal } from "@/lib/board/market-signals";
import {
  isIndexableSignal,
  signalDescription,
  signalJsonLd,
  signalTitle,
} from "@/lib/market-signals/seo";
import { alternatesFor, localeUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import { toDeskRecord } from "@/lib/desk/adapter";
import { factsFor } from "@/lib/desk/facts";
import { railForScreen } from "@/lib/desk/journey";
import { sectorForChapter } from "@/lib/taxonomy/market";
import DeskShell from "@/components/desk/DeskShell";
import KnowledgeBoundary, { type BoundaryItem } from "@/components/desk/KnowledgeBoundary";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import InvestigateButton from "@/components/signals/InvestigateButton";
import "@/components/desk/desk.css";

/**
 * R-FIND station 3, Record: one Market Signal, in The Desk.
 *
 * Three visually distinct regions, and the distinction is the argument:
 *
 *   Region 1, raised paper.  What Ponte HAS established, each item with what
 *                            it rests on.
 *   Region 2, ink.           What Ponte has NOT established. This is the Atlas
 *                            knowledge boundary, used here and on no other
 *                            screen in the product. It carries the same weight
 *                            as region 1 because the limit of what is known is
 *                            what a reader is actually deciding against.
 *   Region 3, sunken well.   The source and evidence boundary: how many sources
 *                            were read, what was opened, who was contacted.
 *
 * The rail sits at Record with Act halted. The halt is not a refusal and not an
 * error: it says the journey needs the member to choose, and that every choice
 * at Act needs an account. Wiring those choices is the next slice; the station
 * states the condition now rather than pretending Act is reachable.
 *
 * What this page will not do, in any state: call a signal vetted, verified,
 * reviewed before publication or a safe counterparty; name its source platform
 * or link its source URL; or print a placeholder where a fact is absent. An
 * unstated fact reads "Not stated" through `factsFor`, and a fact whose absence
 * is not commercially meaningful is not printed at all.
 */

export const dynamic = "force-dynamic";

/**
 * Metadata, and the decision about whether a crawler may have this page.
 *
 * Every signal used to return `title: "Market Signal", robots: { index: false }`
 * with one title for several thousand pages, and none of them reachable. The
 * stated reason for the noindex was real and is answered rather than dropped:
 * only an approved, unexpired, `indexable`, product-bearing signal is offered,
 * and every page that IS offered carries the date the source was read in its
 * title, its description and its structured data. See `lib/market-signals/seo.ts`.
 *
 * A signal that fails any of those predicates keeps the old behaviour exactly:
 * `noindex, nofollow`, and no structured data is emitted for it either.
 */
export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; id: string };
}): Promise<Metadata> {
  const lookup = await getMarketSignal(params.id);
  if (lookup.state !== "visible") {
    return { title: "Market Signal", robots: { index: false, follow: false } };
  }

  const signal = lookup.signal;
  const indexable = isIndexableSignal(signal);
  const canonical = localeUrl(`/market-signals/${params.id}`, params.locale);
  const description = signalDescription(signal);

  return {
    // The root layout template already appends the brand; no suffix here, so
    // the title never carries it twice.
    title: signalTitle(signal),
    description,
    alternates: alternatesFor(`/market-signals/${params.id}`, params.locale),
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: "website",
      url: canonical,
      title: signalTitle(signal),
      description,
    },
  };
}

/**
 * What Ponte has not established about a public signal.
 *
 * These are properties of the record class, not guesses about this row, and
 * each is derived from something structurally true of how a signal is read:
 * one public source, read once, never confirmed with anybody. A row-specific
 * boundary needs investigation findings, which belong to the investigation
 * workspace and do not exist yet. Nothing here is invented to fill the column.
 */
function boundaryFor(signal: MarketSignal): BoundaryItem[] {
  const items: BoundaryItem[] = [
    {
      claim: "Whether the indication is still current",
      because: "The source is not updated after it is read, and Ponte reads it once",
    },
    {
      claim: "Who is behind it, and whether they are willing to be approached",
      because: "No party named in the source has been contacted",
    },
    {
      claim: "Whether anything stated in it is accurate",
      because: "Ponte publishes what the source says, and has not verified it",
    },
  ];

  if (!signal.payment) {
    items.push({
      claim: "Payment terms and instrument",
      because: "Not stated in the source",
    });
  }
  if (!signal.hsCode) {
    items.push({
      claim: "The product's HS classification",
      because: "The source states no HS code, and Ponte has not assigned one to this record",
    });
  }

  return items;
}

/**
 * The schema.org description of this signal, for search engines and for the AI
 * crawlers that read JSON-LD in preference to prose.
 *
 * Emitted under exactly the same predicate as the `index` directive, so a page
 * that tells a crawler not to index it never also hands it structured data to
 * harvest. A seller offer is an `Offer` and a buyer requirement is a `Demand`;
 * no counterparty is named in either, because Ponte does not publish one.
 */
function SignalJsonLd({ signal, url }: { signal: MarketSignal; url: string }) {
  if (!isIndexableSignal(signal)) return null;
  return (
    <script
      type="application/ld+json"
      // The payload is built from our own columns and serialised with
      // JSON.stringify, so it cannot carry markup; `<` is escaped anyway so a
      // product name containing one can never close the script element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(signalJsonLd(signal, url)).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function Detail({ signal, objective }: { signal: MarketSignal; objective: string | null }) {
  const record = toDeskRecord(signal);
  const facts = factsFor(record, { context: "detail-grid" });
  const sector = sectorForChapter(signal.chapter);
  // The action must match the side of the record. A buyer requirement is
  // answered by somebody who can supply it; a seller offer is answered by
  // somebody who would source it. The same control under two labels would be
  // a lie about what the member is declaring.
  const isRequirement = record.cls === "requirement";

  return (
    <div className="detail">
      <div className="detail__m">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href={objective ? `/market-signals?objective=${encodeURIComponent(objective)}` : "/market-signals"}>
            Market Signals
          </Link>
          <span aria-hidden="true">/</span>
          <span>{record.ref}</span>
        </nav>

        <div className="rhead">
          <span className="cls">Market Signal, {record.clsLabel}</span>
          <h1 className="serif">{record.title}</h1>
          <div className="cor">
            {record.corridor ? (
              <>
                <PonteIcon name="primitive.span" size={18} />
                <span>{record.corridor}</span>
                <span className="sep" aria-hidden="true">
                  /
                </span>
              </>
            ) : null}
            <span>{record.ref}</span>
            {sector ? (
              <>
                <span className="sep" aria-hidden="true">
                  /
                </span>
                <PonteIcon name={sector.icon} size={16} />
                <span>{sector.label}</span>
              </>
            ) : null}
            <span className="src">Read {record.readLabel}</span>
          </div>
        </div>

        <dl className="factgrid">
          {facts.map((fact) => (
            <div key={fact.key}>
              <dt>{fact.label}</dt>
              <dd className={fact.missing ? "na" : undefined}>{fact.value}</dd>
            </div>
          ))}
        </dl>

        {/* The action module, above the evidence boundary and immediately below
            the key facts.

            This is the commercial point of the screen. A member who can meet
            the requirement says so here; a member who needs something
            established asks here. Both are the EXISTING Block D requests
            (`signal_investigations`, `request_kind`), reached through the
            existing InvestigateButton: the form is filled anonymously, the
            account gate opens only at Send, and the same request is submitted
            once on return without retyping.

            Neither action reveals or contacts the party behind the signal, and
            neither claims a contact route exists. That is the difference
            between a Market Signal and an introduction, and it is why the
            explanation sits beside the buttons rather than instead of them. */}
        <div className="panel actpanel">
          <div className="panel__h">
            <PonteIcon name="deal.submit" size={16} label="Acting on a record" />
            <b>Act on this signal</b>
            <span>reading is open, acting needs an account</span>
          </div>

          <div className="actpanel__b">
            <p className="actpanel__lead">
              Ponte has not yet established a contact route for this signal. You can ask Ponte to
              investigate it, or register that you may be able to meet it. Both are worked by a
              person, and neither contacts anyone named in the source.
            </p>

            <div className="actpanel__a">
              <InvestigateButton
                signalId={signal.id}
                kind="capability"
                initialType={isRequirement ? "supplier" : "buyer"}
                label={
                  isRequirement ? "I may be able to supply this" : "I may be interested in sourcing this"
                }
              />
              <InvestigateButton
                signalId={signal.id}
                variant="secondary"
                label="Ask Ponte to investigate this signal"
              />
            </div>

            <p className="actpanel__fine">
              Your work is preserved if you are asked to sign in, and the request is sent once on
              return.
            </p>
          </div>
        </div>

        {/* Region 1: what Ponte HAS established, each with what it rests on. */}
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel__h">
            <PonteIcon name="evidence.evprov" size={16} />
            <b>What Ponte has established</b>
            <span>each item carries what it rests on</span>
          </div>
          <div className="erow erow--pos">
            <PonteIcon name="evidence.evprov" size={18} />
            <b>The indication exists in a public source</b>
            <span>Read {record.readLabel}, and published only while approved</span>
          </div>
          <div className="erow erow--pos">
            <PonteIcon name="evidence.evprov" size={18} />
            <b>The record as the source states it</b>
            <span>Recorded as printed, in Ponte&apos;s own words, never the source prose</span>
          </div>
          {sector ? (
            <div className="erow erow--pos">
              <PonteIcon name={sector.icon} size={18} />
              <b>{sector.label}</b>
              <span>Classified by Ponte, HS chapters {sector.range}</span>
            </div>
          ) : (
            <div className="erow erow--gap">
              <PonteIcon name="deal.category" size={18} />
              <b>Sector not assigned</b>
              <span>The source states no HS code, so Ponte files this record under no sector</span>
            </div>
          )}
        </div>

        {/* Region 3: the source and evidence boundary. */}
        <div className="srcband">
          <PonteIcon name="profile.document" size={20} />
          <div>
            <b>Source and evidence boundary</b>
            <p>
              One public source, read once. Ponte has not contacted any party named in it, has not
              seen documents behind it, and holds no relationship with anyone in it. The source
              itself is not published: naming it would expose provenance a public signal must not
              carry.
            </p>
            <ul>
              <li>
                <b>Sources used</b> 1
              </li>
              <li>
                <b>Documents opened</b> none
              </li>
              <li>
                <b>Parties contacted</b> none
              </li>
              <li>
                <b>Confirmed with any party</b> no
              </li>
            </ul>
          </div>
        </div>

      </div>

      {/* Region 2: the ink knowledge boundary. This screen only. */}
      <KnowledgeBoundary items={boundaryFor(signal)} />
    </div>
  );
}

/**
 * The signal existed but is no longer public: expired, withdrawn, unavailable
 * or never approved.
 *
 * A tombstone with no facts, so a stale shared link cannot resurrect a signal,
 * and no invented reason, because the source publishes none. Ponte keeps the
 * reference rather than deleting the record: a record it published is not one
 * it makes disappear from counts and search results without a trace.
 */
function Invalid({ id }: { id: string }) {
  return (
    <div className="detail__m" style={{ maxWidth: 860 }}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/market-signals">Market Signals</Link>
        <span aria-hidden="true">/</span>
        <span>{id}</span>
      </nav>

      <div className="err">
        <PonteIcon name="participation.boundary" size={20} label="Boundary of what is known" />
        <div>
          <b>This signal is no longer available</b>
          <p>
            It has left the public board: a signal is published only while it is approved and
            inside its ninety-day public life. Ponte keeps the reference and the read date so the
            record does not disappear silently from counts or search results, but the content can
            no longer be shown.
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel__h">
          <PonteIcon name="evidence.evprov" size={16} />
          <b>What Ponte retains</b>
          <span>immutable</span>
        </div>
        <div className="erow erow--pos">
          <PonteIcon name="evidence.evprov" size={18} />
          <b>The reference</b>
          <span>{id}</span>
        </div>
        <div className="erow erow--gap">
          <PonteIcon name="participation.boundary" size={18} label="Boundary of what is known" />
          <b>Why it left the board</b>
          <span>Not established. Ponte does not infer a reason the source never published.</span>
        </div>
      </div>

      <p style={{ marginTop: 14 }}>
        <Link className="b" href="/market-signals">
          Back to Market Signals
        </Link>
      </p>
    </div>
  );
}

export default async function MarketSignalPage({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams?: { objective?: string };
}) {
  setRequestLocale(params.locale);

  const objective = searchParams?.objective?.trim() || null;
  const result = await getMarketSignal(params.id);

  if (result.state === "missing") notFound();

  // A record that cannot be read is still a position on the journey: the member
  // is at Record, and Act is still what comes next. The rail does not change
  // because the record turned out to be a tombstone.
  const rail = railForScreen("signal", {
    objectiveStated: Boolean(objective),
    origin: result.state === "visible" ? toDeskRecord(result.signal).ref : params.id,
  });

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={rail} current="market" objective={objective}>
        {result.state === "gone" ? (
          <Invalid id={params.id} />
        ) : (
          <>
            <SignalJsonLd
              signal={result.signal}
              url={localeUrl(`/market-signals/${params.id}`, params.locale as Locale)}
            />
            <Detail signal={result.signal} objective={objective} />
          </>
        )}
      </DeskShell>
    </div>
  );
}
