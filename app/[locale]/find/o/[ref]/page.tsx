import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isRtl, type Locale } from "@/i18n/routing";
import { landingFontVars } from "@/components/home/landing/fonts";
import FindChrome from "@/components/find/FindChrome";
import JourneyBack from "@/components/ponte/nav/JourneyBack";
import RequestIntroduction, { type RequestLabels } from "@/components/find/RequestIntroduction";
import {
  getQualifiedOpportunity,
  type QualifiedOpportunity,
} from "@/lib/board/qualified-opportunity";
import type { PublicLabelKey } from "@/lib/listings/public-labels";
import { presentRecord } from "@/lib/listings/record-facts";
import "@/components/find/find.css";

export const dynamic = "force-dynamic";

const RECEIPT_CLASS: Record<PublicLabelKey, string> = {
  businessChecked: "qreceipt--checked",
  roleDeclared: "qreceipt--declared",
  authoritySighted: "qreceipt--sighted",
  opportunityReviewed: "qreceipt--reviewed",
  lastConfirmed: "qreceipt--confirmed",
};

function fmtDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; ref: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "find" });
  const res = await getQualifiedOpportunity(params.ref);
  if (res.state !== "visible") return { title: t("detail.notFound") };
  return { title: `${res.opportunity.product} · ${res.opportunity.ref}` };
}

export default async function OpportunityPage({
  params,
}: {
  params: { locale: string; ref: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("find");
  const locale = await getLocale();
  const res = await getQualifiedOpportunity(params.ref);

  if (res.state === "missing") notFound();

  return (
    <div className={`ponte-find ${landingFontVars}`} dir={isRtl(params.locale) ? "rtl" : "ltr"}>
      <FindChrome current="opportunities">
        {res.state === "gone" ? (
          <section style={{ paddingTop: 48 }}>
            <div className="qbanner">
              <h1 className="qbanner__h serif">{t("detail.goneTitle")}</h1>
              <p className="qbanner__p">{t("detail.goneBody")}</p>
            </div>
            <Link className="fbtn fbtn--secondary" href="/find">
              {t("detail.goneCta")}
            </Link>
          </section>
        ) : (
          <Detail o={res.opportunity} locale={locale} t={t} />
        )}
      </FindChrome>
    </div>
  );
}

async function Detail({
  o,
  locale,
  t,
}: {
  o: QualifiedOpportunity;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const lastConfirmed = fmtDate(o.lastConfirmed, locale);
  const ns = t("facts.notStated");

  /**
   * The record's own facts, in its own family's vocabulary.
   *
   * This used to be a fixed list of nine product columns, printed for every
   * record. A freight forwarder's public page therefore answered "Quantity",
   * "Incoterm", "HS code", "Origin" and "Destination" with "Not stated": five
   * questions the composer had correctly never asked them, restored by the page
   * that publishes the answer. `presentRecord` emits a family's own facts and
   * NOTHING else, so a row that does not belong cannot be rendered.
   */
  const presentation = presentRecord(o.record);
  const intentLabel = presentation.kindLabel;
  const facts = presentation.facts;

  const requestLabels: RequestLabels = {
    eyebrow: t("request.eyebrow"),
    introTitle: t("request.open"),
    prereqTitle: t("request.prereqTitle"),
    prereq1: t("request.prereq1"),
    prereq2: t("request.prereq2"),
    prereq3: t("request.prereq3"),
    open: t("request.open"),
    title: t("request.title"),
    lead: t("request.lead"),
    readiness: t("request.readiness", { done: "{done}", total: "{total}" }),
    roleLabel: t("request.roleLabel"),
    roleBuyer: t("request.roleBuyer"),
    roleSeller: t("request.roleSeller"),
    roleDistributor: t("request.roleDistributor"),
    roleIntermediary: t("request.roleIntermediary"),
    targetLabel: t("request.targetLabel"),
    targetPlaceholder: t("request.targetPlaceholder"),
    geographyLabel: t("request.geographyLabel"),
    geographyPlaceholder: t("request.geographyPlaceholder"),
    reasonLabel: t("request.reasonLabel"),
    reasonPlaceholder: t("request.reasonPlaceholder"),
    voiceHint: t("request.voiceHint"),
    send: t("request.send"),
    reassure: t("request.reassure"),
    contactHint: t("request.contactHint"),
    sentAck: t("sent.ack"),
    sentTitle: t("sent.title"),
    sentBody: t("sent.body"),
    toWorkspace: t("sent.toWorkspace"),
  };

  return (
    <div className="qdetail">
      <div className="qdmain">
        <JourneyBack href="/find" label={t("detail.back")} />

        <header className="qhead">
          <div className="qhead__tags">
            <span className="qhead__kind">
              <span className="g-dot" aria-hidden="true" />
              {t("qualified.kind")}
            </span>
            <span className="qhead__intent mono">{intentLabel}</span>
            {o.deskManaged && <span className="fev fev--managed">{t("qualified.managed")}</span>}
          </div>
          <h1 className="qhead__h serif">{o.product}</h1>
          <p className="qhead__ref">
            {t("qualified.ref", { ref: o.ref })}
            {lastConfirmed && (
              <>
                {" · "}
                {t("receipts.lastConfirmed")} <b>{lastConfirmed}</b>
              </>
            )}
          </p>
        </header>

        <p className="qlead">{t("detail.lead")}</p>

        {/* Commercial facts lead the body */}
        <section className="qblock" aria-label={t("detail.factsHeading")}>
          <h2 className="qblock__h">{t("detail.factsHeading")}</h2>
          <dl className="qfacts">
            {facts.map((f) => (
              <div className="qfact" key={f.key}>
                <dt className="qfact__k">{f.label}</dt>
                <dd className={`qfact__v${f.value ? "" : " ns"}`}>{f.value ?? ns}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Dated-evidence receipts , never a score */}
        <section className="qblock" aria-label={t("detail.receiptsHeading")}>
          <h2 className="qblock__h">{t("detail.receiptsHeading")}</h2>
          <p className="qlead" style={{ fontSize: 14, margin: "0 0 16px" }}>{t("detail.receiptsIntro")}</p>
          {o.evidence.map((e) => {
            const date = e.date ? fmtDate(e.date, locale) : null;
            return (
              <div className={`qreceipt ${RECEIPT_CLASS[e.key]}`} key={e.key}>
                <span className="qreceipt__ico" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="qreceipt__t">
                  <b>{t(`receipts.${e.key}`)}.</b> {t(`receipts.${e.key}Body`)}
                  {date && (
                    <>
                      {" "}
                      <span className="qreceipt__date">{t("receipts.on", { date })}</span>.
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </section>

        {/* What remains unverified */}
        <section className="qblock" aria-label={t("detail.unverifiedHeading")}>
          <h2 className="qblock__h">{t("detail.unverifiedHeading")}</h2>
          <div className="qunv">
            <ul>
              <li>{t("detail.unverified1")}</li>
              <li>{t("detail.unverified2")}</li>
              <li>{t("detail.unverified3")}</li>
              <li>{t("detail.unverified4")}</li>
            </ul>
          </div>
        </section>
      </div>

      {/* Rail: the controlled introduction */}
      <aside className="qrail">
        <RequestIntroduction reference={o.ref} product={o.product} labels={requestLabels} />
        <div className="qrailmeta">
          <div className="qrailmeta__row">
            <span className="qrailmeta__k">{t("qualified.ref", { ref: "" })}</span>
            <span className="qrailmeta__v mono">{o.ref}</span>
          </div>
          {lastConfirmed && (
            <div className="qrailmeta__row">
              <span className="qrailmeta__k">{t("receipts.lastConfirmed")}</span>
              <span className="qrailmeta__v mono">{lastConfirmed}</span>
            </div>
          )}
          {fmtDate(o.validUntil, locale) && (
            <div className="qrailmeta__row">
              <span className="qrailmeta__k">{t("facts.validUntil")}</span>
              <span className="qrailmeta__v mono">{fmtDate(o.validUntil, locale)}</span>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
