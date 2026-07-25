import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatPosted } from "@/lib/listing-terms";
import { getMarketSignal, type MarketSignal } from "@/lib/board/market-signals";
import { getMarketActivity } from "@/lib/board/market-activity";
import { geographyOf, toBandItems, type ActivityLabels } from "@/lib/board/activity-view";
import PonteShell from "@/components/shell/PonteShell";
import RecordList from "@/components/explore/RecordList";
import InvestigateButton from "@/components/signals/InvestigateButton";
import PonteIcon from "@/design-system/ponte-flow/components/PonteIcon";
import type { FlowIconKey, FlowLabelledKey } from "@/design-system/ponte-flow/generated/flow-icon-keys";
import { PRODUCT_SECTORS, sectorForChapter } from "@/lib/taxonomy/market";
import "@/components/explore/explore.css";
import "@/components/signals/signal.css";

export const dynamic = "force-dynamic";

/**
 * One Market Signal, inside the Ponte Trade shell.
 *
 * This route used to render the legacy obsidian application: its own header and
 * footer, the lowercase "ponte." lockup, marketplace and fees navigation, and a
 * "every listing is reviewed by the desk before it goes live" line sitting
 * directly above a record whose entire point is that Ponte has NOT confirmed
 * it. The North Star landing links here from its activity band, so a visitor
 * one click in left the new product, entered the old one, and was told the
 * opposite of the truth about what they were looking at.
 *
 * It now mounts the shared PonteShell and states its classification plainly and
 * repeatedly: a Market Signal is an indication seen in the open market that
 * Ponte has not confirmed. Nothing on this page calls it vetted, verified,
 * reviewed before publication, or a safe counterparty.
 *
 * Every fact the legacy page carried is preserved: side, quantity, corridor,
 * Incoterm, payment, HS code, signal date, the description, what Ponte knows,
 * what Ponte has not established, and both actions.
 *
 * Reading it requires no account. The account gate sits where it always sat, on
 * the investigation request itself, which is the first thing that would spend
 * Ponte's resources or disclose the visitor.
 */

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "marketSignals" });
  // The root layout template already appends " | Ponte Trade"; no brand suffix
  // here, so the title never carries the brand twice.
  return {
    title: t("label"),
    robots: { index: false },
  };
}

/**
 * One commercial fact.
 *
 * The Flow icon is the field's own parent icon at 20px, which resolves to the
 * authored reduced drawing where one exists. It sits beside the visible field
 * name and is therefore decorative: the word is the label, the icon is not.
 *
 * Deliberately no icon for the VALUE. Incoterms, currencies, units and
 * frequencies keep their exact text, per the handoff's rejected-icons rule; a
 * drawing per Incoterm would be 11 near-identical glyphs carrying nothing the
 * three letters do not already say.
 */
function Fact({
  icon,
  label,
  value,
  notStated,
}: {
  /** A decorative field icon: one that never carries meaning on its own. */
  icon: Exclude<FlowIconKey, FlowLabelledKey>;
  label: string;
  value: string | null;
  notStated: string;
}) {
  return (
    // Block children, not spans: the shared .qfact__k / .qfact__v rules stack a
    // label above its value and space them with a margin, which an inline span
    // silently ignores, running "SIDE" and "Buyer demand" together.
    <div className="qfact">
      <div className="qfact__k">
        <PonteIcon name={icon} size={20} className="qfact__i" />
        {label}
      </div>
      <div className={`qfact__v${value ? "" : " ns"}`}>{value ?? notStated}</div>
    </div>
  );
}

async function Detail({ signal, locale }: { signal: MarketSignal; locale: string }) {
  const t = await getTranslations("marketSignals");
  const th = await getTranslations("home");
  const te = await getTranslations("explore");


  // Only the ends the record actually states. The legacy page printed a literal
  // "?" for a missing end ("? to United Arab Emirates"), which is a punctuation
  // mark pretending to be a fact on a page whose whole subject is what is and
  // is not known. An unstated end now falls through to "Not stated" like every
  // other unstated fact.
  const corridor = geographyOf(signal, { route: (from, to) => th("activity.route", { from, to }) });

  const sideLabel =
    signal.side === "requirement"
      ? t("card.sideBuyer")
      : signal.side === "offer"
        ? t("card.sideSeller")
        : signal.side;
  const notStated = t("card.notStated");

  // The sector, from the canonical taxonomy. A signal whose chapter is
  // unassigned (71, 91, 92) or absent gets no sector row at all rather than
  // being filed under the nearest family: product-authority finding F4.
  const sector = sectorForChapter(signal.chapter);
  const sectorIndex = sector ? PRODUCT_SECTORS.findIndex((s) => s.key === sector.key) : -1;

  // Related recent activity, so the page is a deeper level of the market rather
  // than a dead end. Same bounded read the landing and Explore use.
  const { items } = await getMarketActivity();
  const labels: ActivityLabels = {
    kind: {
      market_signal: th("kinds.marketSignal"),
      member_requirement: th("kinds.memberRequirement"),
      member_offer: th("kinds.memberOffer"),
      service_requirement: th("kinds.serviceRequirement"),
    },
    route: (from, to) => th("activity.route", { from, to }),
    today: th("activity.today"),
    daysAgo: (days) => th("activity.daysAgo", { days }),
  };
  const related = toBandItems(
    items.filter((i) => i.key !== `signal:${signal.id}`).slice(0, 6),
    Date.now(),
    labels,
  );

  return (
    <>
      <nav className="excrumb" aria-label={te("crumb.label")}>
        <Link href="/">{te("crumb.home")}</Link>
        <span aria-hidden="true">/</span>
        <Link href="/explore">{te("crumb.explore")}</Link>
        <span aria-hidden="true">/</span>
        <span>{t("detail.eyebrow")}</span>
      </nav>

      <header className="exhead">
        <div className="exhead__eb">
          <span className="exhead__rule" aria-hidden="true" />
          {/* The classification, first and as a word, never as a colour. */}
          <span className="sigkind">{t("detail.eyebrow")}</span>
        </div>
        <h1 className="exhead__h serif">{signal.product}</h1>

        {/* The unverified status is stated next to the title, not buried in a
            footnote, because it is the single most important fact here. */}
        <p className="sigunv">
          <b>{t("badge")}</b> {t("disclaimer")}
        </p>

        {signal.description && <p className="exhead__d">{signal.description}</p>}
      </header>

      <section className="exsec" aria-label={t("detail.knownHeading")}>
        <div className="exsec__h">
          <h2 className="exsec__t">{t("detail.knownHeading")}</h2>
        </div>
        <div className="qfacts">
          <Fact icon="deal.role" label={t("detail.fact.side")} value={sideLabel} notStated={notStated} />
          <Fact
            icon="deal.quantity"
            label={t("detail.fact.quantity")}
            value={signal.quantity ? `${signal.quantity}${signal.unit ? ` ${signal.unit}` : ""}` : null}
            notStated={notStated}
          />
          <Fact icon="deal.destination" label={t("detail.fact.corridor")} value={corridor} notStated={notStated} />
          <Fact icon="deal.delivery" label={t("detail.fact.incoterm")} value={signal.incoterm} notStated={notStated} />
          <Fact icon="deal.payment" label={t("detail.fact.payment")} value={signal.payment} notStated={notStated} />
          <Fact icon="deal.category" label={t("detail.fact.hsCode")} value={signal.hsCode} notStated={notStated} />
          <Fact
            icon="deal.timing"
            label={t("detail.fact.signalDate")}
            value={formatPosted(signal.spottedAt, locale)}
            notStated={notStated}
          />
        </div>
      </section>

      {sector && (
        <section className="exsec" aria-label={t("detail.sectorHeading")}>
          <div className="exsec__h">
            <h2 className="exsec__t">{t("detail.sectorHeading")}</h2>
          </div>
          {/* The sector is navigation, so it is a link into Explore rather than
              a decoration. The 24px asset is the sector default. */}
          <Link className="sigsector" href={`/explore?sector=${sectorIndex}`}>
            <PonteIcon name={sector.icon} size={24} />
            <span className="sigsector__t">{sector.label}</span>
            <span className="sigsector__r">{sector.range}</span>
          </Link>
        </section>
      )}

      <section className="exsec" aria-label={t("detail.unknownHeading")}>
        <div className="exsec__h">
          <h2 className="exsec__t">{t("detail.unknownHeading")}</h2>
        </div>
        <ul className="sigunk">
          {(["u1", "u2", "u3", "u4"] as const).map((k) => (
            <li key={k}>{t(`detail.unknowns.${k}`)}</li>
          ))}
        </ul>
      </section>

      {/* Both actions open the same structured investigation request behind the
          account gate. Neither reveals or contacts the third party, and the
          copy below says so, so nobody reads a click as an introduction. */}
      <section className="exsec" aria-label={t("detail.actionsHeading")}>
        <div className="exsec__h">
          <h2 className="exsec__t">{t("detail.actionsHeading")}</h2>
        </div>
        <p className="exsec__d">{t("detail.actionsNote")}</p>
        {/* Registration is a gate the visitor can pass now, so it uses the
            gate asset and says what it gates. It is labelled because the icon
            is the only carrier of "registration required" in this row. */}
        <p className="sigbound">
          <PonteIcon
            name="participation.registration"
            size={20}
            label={t("detail.registrationNote")}
          />
          <span>{t("detail.registrationNote")}</span>
        </p>

        <div className="sigacts">
          <InvestigateButton signalId={signal.id} label={t("cta.askPonte")} />
          <InvestigateButton
            signalId={signal.id}
            label={signal.side === "requirement" ? t("cta.secondarySupply") : t("cta.secondaryBuy")}
            variant="secondary"
            initialType={signal.side === "requirement" ? "supplier" : "buyer"}
          />
        </div>
      </section>

      {/* Communication is unavailable, and the rule is that the condition must
          always be stated. It is not a block, a warning or a finding about
          anyone: no channel exists yet, and the sentence says what would open
          one. `participation.commson` is never rendered here, because the
          product does not permit communication at all. */}
      <section className="exsec" aria-label={t("detail.commsHeading")}>
        <div className="exsec__h">
          <h2 className="exsec__t">{t("detail.commsHeading")}</h2>
        </div>
        <p className="sigbound">
          <PonteIcon name="participation.commsoff" size={20} />
          <span>{t("detail.commsUnavailable")}</span>
        </p>
      </section>

      {related.length > 0 && (
        <section className="exsec" aria-label={te("activity.title")}>
          <div className="exsec__h">
            <h2 className="exsec__t">{te("activity.title")}</h2>
          </div>
          <RecordList
            items={related}
            labels={{ view: te("record.view"), listLabel: te("record.listLabel") }}
          />
        </section>
      )}

      <section className="exdeal" aria-label={te("deal.title")}>
        <div>
          <p className="exdeal__t">{te("deal.title")}</p>
          <p className="exdeal__d">{te("deal.lead")}</p>
        </div>
        <Link className="fbtn" href="/structure">
          {te("deal.cta")}
        </Link>
      </section>
    </>
  );
}

/**
 * The signal existed but is no longer public: expired, withdrawn, unavailable
 * or not approved. A tombstone with no facts, so a stale shared link cannot
 * resurrect a signal, and a route back into the live market.
 */
async function Tombstone() {
  const t = await getTranslations("marketSignals");
  const te = await getTranslations("explore");
  return (
    <header className="exhead">
      <div className="exhead__eb">
        <span className="exhead__rule" aria-hidden="true" />
        <span className="sigkind">{t("detail.eyebrow")}</span>
      </div>
      <h1 className="exhead__h serif">{t("detail.tombstone")}</h1>
      <p className="exhead__d">{te("activity.lead")}</p>
      <p style={{ marginTop: 24 }}>
        <Link className="fbtn fbtn--secondary" href="/explore">
          {te("nav.explore")}
        </Link>
      </p>
    </header>
  );
}

export default async function MarketSignalPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  setRequestLocale(params.locale);
  const result = await getMarketSignal(params.id);

  if (result.state === "missing") notFound();

  return (
    <PonteShell locale={params.locale} current="explore">
      {result.state === "gone" ? (
        <Tombstone />
      ) : (
        <Detail signal={result.signal} locale={params.locale} />
      )}
    </PonteShell>
  );
}
