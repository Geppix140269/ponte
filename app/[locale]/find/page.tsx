import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isRtl, type Locale } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import FindChrome from "@/components/find/FindChrome";
import FindCategoryEntry from "@/components/find/FindCategoryEntry";
import CoverageNotice, { coverageValues } from "@/components/find/CoverageNotice";
import QoRow from "@/components/find/QoRow";
import SignalRow from "@/components/find/SignalRow";
import HsProductPicker from "@/components/find/HsProductPicker";
import PonteFooter from "@/components/PonteFooter";
import { searchLiveDeals } from "@/lib/board/live-deals";
import { searchSignalInventory } from "@/lib/board/inventory";
import {
  parseFindQuery,
  buildFindHref,
  findQueryIsAnswerable,
  toInventoryQuery,
  type FindQuery,
} from "@/lib/find/query";
import { presentBoard } from "@/lib/board/presentation";
import { serviceCategory, serviceSubcategory } from "@/lib/taxonomy/services";
import { partnerType } from "@/lib/taxonomy/distribution";
import "@/components/find/find.css";
import "@/components/ponte/category/category.css";
// Issue #130 Stage 2: the family choice is a Bridge, so this route carries the
// approved Bridge stylesheet and the implementation layer beside it.
import "@/design/authority/bridge/v1/source/ponte-bridge.css";
import "@/components/ponte/bridge/bridge-integration.css";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "find" });
  return { title: t("meta.title"), description: t("meta.description") };
}

export default async function FindPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: SP;
}) {
  setRequestLocale(params.locale);
  const q = parseFindQuery(searchParams);

  /**
   * What has to be true before Find can answer, per family.
   *
   * Products still needs a product. Trade services needs a category and
   * Distribution needs a partner type, and both of those are a tap. Requiring a
   * typed product for all three is what left two of Ponte's three equal market
   * families with no working search at all.
   */
  const answerable = findQueryIsAnswerable(q);
  const isProducts = q.family === "products" || (!q.family && q.product !== null);

  return (
    <div className={`ponte-find ${landingFontVars}`} dir={isRtl(params.locale) ? "rtl" : "ltr"}>
      <FindChrome current="opportunities">
        {!answerable ? (
          isProducts ? (
            <ProductEntry />
          ) : (
            <FindCategoryEntry q={q} />
          )
        ) : (
          <Results q={q} />
        )}
      </FindChrome>
      <PonteFooter />
    </div>
  );
}

/** The Find entry for products: no product yet, so choose one. */
async function ProductEntry() {
  const t = await getTranslations("find");
  return (
    <section className="fphead" aria-label={t("entry.title")} style={{ borderBottom: "none" }}>
      <div className="fphead__eb">
        <span className="fphead__rule" aria-hidden="true" />
        <span className="eyebrow">{t("entry.eyebrow")}</span>
      </div>
      <h1 className="fphead__h serif">{t("entry.title")}</h1>
      <p className="fphead__def">{t("entry.lead")}</p>
      <div className="fctx">
        <Link className="fctx__edit" href={buildFindHref({})}>
          {t("family.changeMarket")}
        </Link>
      </div>
      <div style={{ marginTop: 24 }}>
        <HsProductPicker
          labels={{
            chaptersLabel: t("entry.chaptersLabel"),
            searchPlaceholder: t("entry.searchPlaceholder"),
            back: t("entry.back"),
            voice: t("entry.voice"),
            noMatch: t("entry.noMatch"),
            hint: t("entry.pickerHint"),
          }}
        />
      </div>
    </section>
  );
}

/** The intent segmented control, rendered as links so it works without JS. */
function IntentSeg({
  q,
  ariaLabel,
  items,
}: {
  q: FindQuery;
  ariaLabel: string;
  items: { key: FindQuery["intent"]; label: string }[];
}) {
  return (
    <div className="fseg" role="group" aria-label={ariaLabel}>
      {items.map((it) => (
        <Link
          key={it.label}
          className="fseg__b"
          aria-pressed={q.intent === it.key}
          href={buildFindHref({ ...q, intent: it.key ?? undefined })}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

/** What the member searched for, in words, for the heading and the crumbs. */
function subjectOf(q: FindQuery): string {
  if (q.family === "services") {
    const sub = serviceSubcategory(q.serviceSubcategory)?.label;
    return sub ?? serviceCategory(q.serviceCategory)?.label ?? "";
  }
  if (q.family === "distribution") {
    return partnerType(q.partnerType)?.label ?? "";
  }
  return q.product ?? "";
}

async function Results({ q }: { q: FindQuery }) {
  const t = await getTranslations("find");
  const subject = subjectOf(q);
  const inventory = toInventoryQuery(q);

  // Both lanes filter at the database over the complete record set. The
  // Qualified lane used to read the newest sixty and filter them in memory,
  // which answered a question about the market with a fact about a page.
  const [board, signals] = await Promise.all([
    searchLiveDeals(inventory, { limit: 40 }),
    searchSignalInventory(inventory, { limit: 40 }),
  ]);

  // Results exist in two states: complete coverage, and coverage over the part
  // of the inventory that carries a category. Both return real records.
  // Records come back in three states, not one. `ok` is the only one whose
  // emptiness is conclusive; `partial` and `coverage_unknown` both carry real
  // records and both refuse to call an empty result "no match".
  const answered = (s: { state: string }) =>
    s.state === "ok" || s.state === "partial" || s.state === "coverage_unknown";
  const deals = answered(board) && "deals" in board ? board.deals : [];
  const signalRows = answered(signals) && "signals" in signals ? signals.signals : [];

  // The same table the Market Signals board uses. Written once so the rule that
  // only `ok` may present an emptiness as a finding cannot hold on one surface
  // and not the other.
  // Find only reaches results once a query is answerable, so every result here
  // is a narrowed search. Its empty copy is already about the match rather than
  // about the market, which is why both lanes read `genuineEmpty` as a flag.
  const qo = presentBoard(board.state, deals.length, { filtered: true });
  const ms = presentBoard(signals.state, signalRows.length, { filtered: true });

  const qoBase = {
    kind: t("qualified.kind"),
    view: t("qualified.view"),
    buy: t("facts.buy"),
    sell: t("facts.sell"),
    service: t("facts.service"),
    notStated: t("facts.notStated"),
  };
  const sigLabels = {
    kind: t("signals.kind"),
    disclaimer: t("signals.disclaimer"),
    notStated: t("facts.notStated"),
  };

  return (
    <>
      <section className="fphead">
        <div className="fphead__eb">
          <span className="fphead__rule" aria-hidden="true" />
          <span className="eyebrow">{t("results.eyebrow")}</span>
        </div>
        <h1 className="fphead__h serif">{t("results.titleFor", { product: subject })}</h1>
        <p className="fphead__def">{t("results.definition")}</p>
      </section>

      <div className="fctx">
        <div className="fctx__crumbs">
          <span>
            {crumbLabel(q, t)}: <b>{subject}</b>
          </span>
          {q.market && (
            <span>
              · {t("results.crumbMarket")}: <b>{q.market}</b>
            </span>
          )}
        </div>
        <Link className="fctx__edit" href={changeHref(q)}>
          {t("results.editSearch")}
        </Link>
        <span className="fctx__spacer" />
        <IntentSeg
          q={q}
          ariaLabel={t("results.crumbIntent")}
          items={[
            { key: null, label: t("results.intentAll") },
            { key: "requirement", label: t("results.intentRequirement") },
            { key: "offer", label: t("results.intentOffer") },
            { key: "service", label: t("results.intentService") },
          ]}
        />
      </div>

      {/* A chosen service category still offers its detail list, so a member
          can narrow without going back to the start. */}
      {q.family === "services" && <FindCategoryEntry q={q} />}
      {q.family === "distribution" && <FindCategoryEntry q={q} />}

      <div className="flanes">
        <section className="flane flane--qo" aria-label={t("qualified.laneTitle")}>
          <div className="flane__head">
            <h2 className="flane__t serif">
              <span className="g-dot" aria-hidden="true" />
              {t("qualified.laneTitle")}
            </h2>
            <span className="flane__n">
              {"total" in board ? t("qualified.count", { count: board.total }) : ""}
            </span>
          </div>
          {qo.coverageNotice === "partial" && board.state === "partial" && (
            <CoverageNotice
              coverage={board.coverage}
              empty={deals.length === 0}
              labels={coverageLabels(board.coverage, t)}
            />
          )}
          {qo.coverageNotice === "unknown" && (
            <CoverageNotice empty={deals.length === 0} labels={unknownLabels(t)} />
          )}
          {qo.unclassified && board.state === "unclassified" ? (
            <Unclassified q={q} reason={board.reason} t={t} />
          ) : qo.records ? (
            deals.map((d) => (
              <QoRow
                key={d.id}
                deal={d}
                href={`/find/o/${d.ref}`}
                labels={{ ...qoBase, ref: t("qualified.ref", { ref: d.ref ?? "" }) }}
              />
            ))
          ) : !qo.genuineEmpty ? null : (
            <div className="fstate">
              <span className="fstate__badge">{t("qualified.emptyBadge")}</span>
              <h3 className="fstate__h serif">{t("qualified.emptyTitle")}</h3>
              <p className="fstate__p">{t("qualified.emptyBody")}</p>
              <Link className="fbtn fbtn--secondary" href="/structure">
                {t("nav.submit")}
              </Link>
            </div>
          )}
        </section>

        <section className="flane flane--ms" aria-label={t("signals.laneTitle")}>
          <div className="flane__head">
            <h2 className="flane__t">{t("signals.laneTitle")}</h2>
            <span className="flane__n">
              {"total" in signals ? t("signals.count", { count: signals.total }) : ""}
            </span>
          </div>
          <p className="flane__note">{t("signals.note")}</p>
          {ms.coverageNotice === "partial" && signals.state === "partial" && (
            <CoverageNotice
              coverage={signals.coverage}
              empty={signalRows.length === 0}
              labels={coverageLabels(signals.coverage, t)}
            />
          )}
          {ms.coverageNotice === "unknown" && (
            <CoverageNotice empty={signalRows.length === 0} labels={unknownLabels(t)} />
          )}
          {ms.unclassified && signals.state === "unclassified" ? (
            <Unclassified q={q} reason={signals.reason} eligible={signals.eligible} t={t} />
          ) : ms.records ? (
            signalRows.map((s) => <SignalRow key={s.id} signal={s} labels={sigLabels} />)
          ) : !ms.genuineEmpty ? null : (
            <div className="fstate">
              <h3 className="fstate__h serif">{t("signals.emptyTitle")}</h3>
              <p className="fstate__p">{t("signals.emptyBody")}</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/**
 * The state that is neither a result nor an emptiness.
 *
 * Ponte cannot yet say which published records belong to this category,
 * because none of them carries one. Printing "no match" here would be Ponte
 * reporting a finding it never made, and it is the same distinction the board
 * already draws between "nothing was found" and "nothing could be read".
 */
function Unclassified({
  q,
  reason,
  eligible,
  t,
}: {
  q: FindQuery;
  reason: "columns_absent" | "nothing_classified";
  /** Records that exist in this market and carry no category. */
  eligible?: number | null;
  t: Awaited<ReturnType<typeof getTranslations<"find">>>;
}) {
  return (
    <div className="fstate">
      <span className="fstate__badge">{t("unclassified.badge")}</span>
      <h3 className="fstate__h serif">{t("unclassified.title")}</h3>
      <p className="fstate__p">
        {reason === "columns_absent"
          ? t("unclassified.bodyColumnsAbsent")
          : t("unclassified.bodyNothingClassified")}
      </p>
      {/* The size of what could not be filtered. Printed only when Ponte
          actually counted it: an unknown count is not zero, and rendering it
          as one would understate the inventory a member cannot reach. */}
      {typeof eligible === "number" && (
        <p className="fstate__p">{t("unclassified.eligible", { count: eligible })}</p>
      )}
      <Link className="fbtn fbtn--secondary" href={buildFindHref({ family: q.family ?? undefined })}>
        {t("unclassified.action")}
      </Link>
    </div>
  );
}

/** The copy for a coverage that could not be established at all. */
function unknownLabels(t: Awaited<ReturnType<typeof getTranslations<"find">>>) {
  return {
    badge: t("coverageUnknown.badge"),
    heading: t("coverageUnknown.heading"),
    body: t("coverageUnknown.body"),
    emptyHeading: t("coverageUnknown.emptyHeading"),
    emptyBody: t("coverageUnknown.emptyBody"),
  };
}

/** The coverage copy, with the three numbers derived from one source. */
function coverageLabels(
  coverage: { classified: number; eligible: number },
  t: Awaited<ReturnType<typeof getTranslations<"find">>>,
) {
  const values = coverageValues(coverage);
  return {
    badge: t("partial.badge"),
    heading: t("partial.heading", values),
    body: t("partial.body", values),
    emptyHeading: t("partial.emptyHeading"),
    emptyBody: t("partial.emptyBody", values),
  };
}

function crumbLabel(q: FindQuery, t: (key: string) => string): string {
  if (q.family === "services") return t("family.crumbCategory");
  if (q.family === "distribution") return t("family.crumbPartner");
  return t("results.crumbProduct");
}

/** Back to the question that produced this result, not to the very start. */
function changeHref(q: FindQuery): string {
  if (q.family === "services") return buildFindHref({ family: "services" });
  if (q.family === "distribution") return buildFindHref({ family: "distribution" });
  return buildFindHref({ family: "products" });
}
