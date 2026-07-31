import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import "@/components/desk/desk.css";

/**
 * Fees: one product, one formula.
 *
 * Authority: `PT-COMMERCIAL-2026-07-31-01` section 19, recorded by ADR-0020.
 * Stage 6 of `docs/plans/active/deal-room-transaction-pricing.md`.
 *
 * ## What changed, and why the shape changed with it
 *
 * This page used to publish four engagements in an `auto-fit` grid: a free
 * marketplace, Credits at 2 per counterparty check, a Desk success fee and a
 * Desk retainer. Three of those four are monetisation the authority prohibits
 * (section 15), and the Deal Room - Ponte's only paid product - was not
 * mentioned at all. That was LB-014.
 *
 * Section 19 does not only change the words. It says the page "must present one
 * product and one formula" and "must not use a multi-plan comparison grid". So
 * the grid is gone rather than refilled: a single product panel, then the
 * formula stated in prose, then what is included and what is never charged for.
 * A reader scanning for "which tier am I" should find the question does not
 * apply.
 *
 * ## Design
 *
 * Only the approved Desk vocabulary already used by this page and by Account -
 * `panel`, `panel__h`, `sec`, `kicker`, `serif`, `b`, `b--2` - and the `--ink-2`
 * and `--gold-ink` tokens. No new component, no new token, no icon, no motion.
 * The one editorial emphasis stays the AA-safe gold ink, which is emphasis and
 * never a status.
 */

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "pricing",
  });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: alternatesFor("/pricing", params.locale),
  };
}

const HEAD: CSSProperties = {
  fontSize: "clamp(30px, 4.6vw, 46px)",
  lineHeight: 1.08,
  letterSpacing: "-0.022em",
  fontWeight: 500,
  margin: "14px 0 12px",
  maxWidth: "20ch",
};

const LEAD: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.6,
  color: "var(--ink-2)",
  maxWidth: "62ch",
};

/** One product, so one panel at a readable measure - not a grid of tiers. */
const PRODUCT: CSSProperties = { maxWidth: 560 };

const BODY: CSSProperties = {
  padding: "15px 16px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 9,
};

const NAME: CSSProperties = { fontSize: 15, fontWeight: 600, lineHeight: 1.35 };

const PRICE: CSSProperties = {
  fontSize: 34,
  fontWeight: 500,
  letterSpacing: "-0.018em",
  lineHeight: 1.1,
};

const COPY: CSSProperties = { fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" };

const ACT: CSSProperties = { paddingTop: 8 };

const SUBHEAD: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.35,
  margin: "0 0 6px",
};

const PROSE: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.65,
  color: "var(--ink-2)",
  maxWidth: "68ch",
  margin: "0 0 8px",
};

/**
 * The formula, as three plain sentences and one worked example.
 *
 * Deliberately prose rather than a table. A price table beside a product panel
 * reads as a tier ladder, which is the comparison grid section 19 forbids, and
 * the formula is simple enough that a reader does not need to look anything up.
 */
const FORMULA_LINE: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.65,
  margin: "0 0 6px",
};

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="sec">
      <h2 className="serif" style={SUBHEAD}>
        {heading}
      </h2>
      {children}
    </section>
  );
}

export default async function PricingPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("pricing");

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={null} objective={null}>
        <section className="sec">
          <p className="kicker">{t("pill")}</p>
          <h1 className="serif" style={HEAD}>
            {t.rich("title", {
              em: (chunks) => (
                // The one editorial emphasis on the page, in the AA-safe gold
                // ink token. Gold here is emphasis, not a status.
                <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--gold-ink)" }}>
                  {chunks}
                </em>
              ),
            })}
          </h1>
          <p style={LEAD}>{t("intro")}</p>
        </section>

        {/* One product. One panel. */}
        <section className="sec">
          <div className="panel" style={PRODUCT}>
            <div className="panel__h">
              <b>{t("product.terms")}</b>
            </div>
            <div style={BODY}>
              <h2 style={NAME}>{t("product.name")}</h2>
              <p className="serif" style={PRICE}>
                {t("product.price")}
              </p>
              <p style={COPY}>{t("product.body")}</p>
              <div style={ACT}>
                <Link className="b" href="/deal-rooms">
                  {t("product.cta")}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Section heading={t("formula.heading")}>
          <p style={FORMULA_LINE}>{t("formula.included")}</p>
          <p style={FORMULA_LINE}>{t("formula.additional")}</p>
          <p style={FORMULA_LINE}>{t("formula.cap")}</p>
          <p style={{ ...PROSE, marginTop: 8 }}>{t("formula.worked")}</p>
        </Section>

        <Section heading={t("languages.heading")}>
          <p style={PROSE}>{t("languages.body")}</p>
        </Section>

        <Section heading={t("free.heading")}>
          <p style={PROSE}>{t("free.body")}</p>
        </Section>

        <Section heading={t("expiry.heading")}>
          <p style={PROSE}>{t("expiry.body")}</p>
        </Section>

        <Section heading={t("check.heading")}>
          <p style={PROSE}>{t("check.body")}</p>
          <Link className="b b--2" href="/verification">
            {t("check.cta")}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </Section>

        <Section heading={t("never.heading")}>
          <p style={PROSE}>{t("never.body")}</p>
        </Section>

        <section className="sec">
          <p style={{ ...COPY, maxWidth: "72ch" }}>{t("footnote")}</p>
        </section>
      </DeskShell>
    </div>
  );
}
