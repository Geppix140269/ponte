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
import {
  LISTING_LANGS,
  cachedListingTranslation,
  getListingTranslation,
} from "@/lib/listings/translation";
import { getUser } from "@/lib/auth";
import { APP_URL, alternatesFor } from "@/lib/seo";
import {
  CHAIN_KEYS,
  TIMING_KEYS,
  extractTiming,
  formatPosted,
  labelFor,
  verificationKey,
} from "@/lib/listing-terms";
import "@/components/find/find.css";

/**
 * The rest of the query, so a switcher link changes the language and nothing
 * else. Someone arriving from a campaign or a filtered board keeps whatever
 * carried them here.
 */
type DetailSearchParams = { lang?: string } & Record<string, string | string[] | undefined>;

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

/**
 * The opening of the record's own prose, for a reader who has not signed in
 * and for the social card. The same shape and the same ellipsis the shareable
 * marketplace page used, so a link that was forwarded before the cutover and
 * one forwarded after it read identically.
 */
function teaser(details: string, max = 160): string {
  return details.length > max ? details.slice(0, max) + "…" : details;
}

/**
 * The social card for one opportunity.
 *
 * This is the link a member forwards on WhatsApp, so the page has to arrive as
 * an opportunity rather than as a bare URL: a description, the record's own
 * photograph at card size, and a canonical plus hreflang set so the forwarded
 * link and the indexed link are the same page.
 *
 * Deliberately built from the ORIGINAL wording, never a translation. The card
 * is cached by whoever unfurls it, one copy for every reader, so it must be the
 * text the record actually states rather than one reader's chosen language.
 */
export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; ref: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "find" });
  const res = await getQualifiedOpportunity(params.ref);
  if (res.state !== "visible") return { title: t("detail.notFound") };

  const o = res.opportunity;
  const title = `${o.product} · ${o.ref}`;
  const description = t("detail.metaDescription", {
    kind: presentRecord(o.record).kindLabel,
    teaser: teaser(o.details, 120),
  });
  const image = o.image;

  return {
    title,
    description,
    // The stored reference, not the one that was typed: `getQualifiedOpportunity`
    // matches case-insensitively, so a canonical built from the request would
    // vary with the casing of whichever link the reader followed.
    alternates: alternatesFor(`/find/o/${o.ref}`, params.locale),
    openGraph: {
      title: `${title} | Ponte Trade`,
      description,
      url: `${APP_URL}/find/o/${o.ref}`,
      siteName: "Ponte",
      type: "website",
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${title} | Ponte Trade`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function OpportunityPage({
  params,
  searchParams,
}: {
  params: { locale: string; ref: string };
  searchParams: DetailSearchParams;
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
          <Detail o={res.opportunity} locale={locale} t={t} searchParams={searchParams} />
        )}
      </FindChrome>
    </div>
  );
}

async function Detail({
  o,
  locale,
  t,
  searchParams,
}: {
  o: QualifiedOpportunity;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
  searchParams: DetailSearchParams;
}) {
  const lastConfirmed = fmtDate(o.lastConfirmed, locale);
  const ns = t("facts.notStated");
  // The option labels the member picked in the composer, in the reader's
  // language. Same source as the form, so this page cannot drift from it.
  const tf = await getTranslations("listingForm");
  // Signed in or not. The only thing it decides here is how much of the
  // record's own prose is shown; nothing about the counterparty depends on it.
  const user = await getUser();

  /**
   * The record read in the reader's own language.
   *
   * An explicit `?lang` always wins. With no choice made at all, the record
   * opens in the current interface language WHEN it has already been translated
   * into it, and never translates on demand in that case: an unasked-for page
   * load must not spend a translation. `?lang=original` pins the source wording.
   *
   * The interface-locale branch reads as dead code today, because
   * `i18n/routing.ts` ships `locales = ["en"]` and English needs no
   * translation. It is kept exactly as it is because it is the rule that makes
   * this correct the day a second interface language is added back, and
   * "simplifying" it to today's single locale would quietly delete that.
   */
  const requested = LISTING_LANGS.some((l) => l.code === searchParams.lang)
    ? (searchParams.lang as string)
    : null;
  let lang = requested;
  let translation = requested ? await getListingTranslation(o, requested) : null;
  if (!searchParams.lang && LISTING_LANGS.some((l) => l.code === locale)) {
    const cached = await cachedListingTranslation(o.id, locale);
    if (cached) {
      lang = locale;
      translation = cached;
    }
  }
  const shownProduct = translation?.product ?? o.product;
  const shownDetails = translation?.details ?? o.details;

  /** A switcher link: the same page, the same query, one language changed. */
  const langHref = (code: string): string => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "lang" || value === undefined) continue;
      for (const one of Array.isArray(value) ? value : [value]) qs.append(key, one);
    }
    qs.set("lang", code);
    return `/find/o/${o.ref}?${qs.toString()}`;
  };

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

  /**
   * The family's own facts, then the three that are true of every record.
   *
   * Timing, position in the chain and the posted date belong to no family in
   * particular, so `presentRecord` does not emit them and they are appended
   * here rather than pushed into the shared presenter. Timing is read out of
   * the ORIGINAL prose and never the translation: the composer writes that one
   * line ("Availability:" / "Needed:") in English on every record.
   */
  const facts: { key: string; label: string; value: string | null }[] = [
    ...presentation.facts.map((f) => ({ key: f.key, label: f.label, value: f.value })),
    {
      key: "timing",
      label: t("facts.timing"),
      value: labelFor(extractTiming(o.details), TIMING_KEYS, tf),
    },
    {
      key: "chain",
      label: t("facts.chain"),
      value: labelFor(o.chainDepth, CHAIN_KEYS, tf),
    },
    {
      key: "posted",
      label: t("facts.posted"),
      value: formatPosted(o.createdAt, locale) || null,
    },
  ];

  /**
   * The owner's verification LEVEL, which is a fact about whether to spend time
   * here and not an identity. `verificationKey` decides WHICH of the five
   * statements is true; it names them in the marketplace catalogue, and Find
   * carries the same five under `find.verification`, so only the namespace
   * differs and the two surfaces cannot state different levels.
   */
  const levelKey = verificationKey(o.trustLevel).replace("trust.", "");

  const shareText = `${t("detail.shareText", { product: o.product, ref: o.ref })}\n${APP_URL}/find/o/${o.ref}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

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
          <h1 className="qhead__h serif">{shownProduct}</h1>
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

        {/* Read this record in your language. A reading aid, deliberately
            quiet: it must never read as the action on this page, which is the
            controlled introduction in the rail. */}
        <div className="qlang">
          <span className="qlang__k">{t("detail.readIn")}</span>
          <Link
            className={`qlang__l${!lang ? " is-current" : ""}`}
            href={langHref("original")}
          >
            {t("detail.original")}
          </Link>
          {LISTING_LANGS.map((l) => (
            <Link
              key={l.code}
              className={`qlang__l${lang === l.code ? " is-current" : ""}`}
              href={langHref(l.code)}
              lang={l.code}
            >
              {l.label}
            </Link>
          ))}
          {lang && <span className="qlang__note">{t("detail.machineTranslation")}</span>}
        </div>

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

        {/* The desk-approved public text: what Ponte qualified, and the
            limitations that remain. Desk-written, not raw model output, and
            shown only when it exists. */}
        {(o.deskQualification || o.deskLimitations) && (
          <section className="qblock" aria-label={t("detail.reviewLabel")}>
            <h2 className="qblock__h">{t("detail.reviewLabel")}</h2>
            {o.deskQualification && <p className="qreview__q">{o.deskQualification}</p>}
            {o.deskLimitations && <p className="qreview__l">{o.deskLimitations}</p>}
          </section>
        )}

        {/* The record's OWN prose, which is the only place several stated terms
            reach the reader at all: until migration 20260728d is applied the
            family commercial terms are not columns, so a service or a
            distribution record states them here and nowhere else.

            Gated exactly as the shareable marketplace page gated it. A visitor
            who has not signed in reads the opening 160 characters and is told
            where the rest is; a member reads the whole thing. The gate is on
            LENGTH only: nothing withheld here is about the counterparty, whose
            identity is not on this page for anyone. */}
        {(shownDetails.trim() || o.image) && (
          <section className="qblock" aria-label={t("detail.statedHeading")}>
            <h2 className="qblock__h">{t("detail.statedHeading")}</h2>
            {shownDetails.trim() && (
              <>
                <p className="qstated">{user ? shownDetails : teaser(shownDetails)}</p>
                {!user && (
                  <Link
                    className="qstated__gate"
                    href={`/login?next=${encodeURIComponent(`/find/o/${o.ref}`)}`}
                  >
                    {t("detail.signInToRead")}
                  </Link>
                )}
              </>
            )}
            {o.image && (
              // Context, not the decision, so it sits under the record's own
              // words rather than above them.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="qphoto" src={o.image} alt={shownProduct} />
            )}
          </section>
        )}

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

          {/* The level the owner's member-business verification reached, and
              the route to what each level actually checks. A level is a fact
              about the check, not a name: it says nothing about who they are. */}
          <p className="qlevel">
            <span className="qlevel__k">{t("verification.heading")}</span>
            <b className="qlevel__v">{t(`verification.${levelKey}`)}</b>
            <Link className="qlevel__l" href="/verification">
              {t("verification.link")}
            </Link>
          </p>
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

        {/* Forwarding the opportunity. The reference and the URL only: the
            share text names the record, never the member behind it. */}
        <div className="qshare">
          <a className="fbtn fbtn--secondary" href={waUrl} target="_blank" rel="noopener noreferrer">
            {t("detail.share")}
          </a>
        </div>
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
