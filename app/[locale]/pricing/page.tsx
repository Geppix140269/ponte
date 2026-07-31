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
 * Fees, on the Desk (Issue #130 Stage 3).
 *
 * This page was still drawn by the retired obsidian chrome, so a member who
 * reached it from any Desk surface left the current generation at the exact
 * moment they were reading what Ponte charges. It now renders the same Desk
 * shell as Account and Your records.
 *
 * Nothing commercial changed. Every price, every term, every body line and the
 * footnote are the same translated strings, in the same order, pointing at the
 * same four destinations. The four engagements are four register panels: the
 * terms line is the panel caption, because that is what it is, and the free
 * marketplace keeps the primary control while the three paid engagements keep
 * the secondary one, which is the hierarchy the page already had.
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

const GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(232px, 1fr))",
  gap: 12,
  alignItems: "stretch",
};

const CARD: CSSProperties = { display: "flex", flexDirection: "column" };

const BODY: CSSProperties = {
  padding: "15px 16px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 9,
  flex: 1,
};

const NAME: CSSProperties = { fontSize: 15, fontWeight: 600, lineHeight: 1.35 };

const PRICE: CSSProperties = {
  fontSize: 27,
  fontWeight: 500,
  letterSpacing: "-0.018em",
  lineHeight: 1.1,
};

const COPY: CSSProperties = { fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" };

const ACT: CSSProperties = { marginTop: "auto", paddingTop: 8 };

/** One engagement: the terms as the register caption, then the offer itself. */
function Engagement({
  terms,
  name,
  price,
  body,
  action,
}: {
  terms: string;
  name: string;
  price: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <div className="panel" style={CARD}>
      <div className="panel__h">
        <b>{terms}</b>
      </div>
      <div style={BODY}>
        <h3 style={NAME}>{name}</h3>
        <p className="serif" style={PRICE}>
          {price}
        </p>
        <p style={COPY}>{body}</p>
        <div style={ACT}>{action}</div>
      </div>
    </div>
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

        <section className="sec">
          <div style={GRID}>
            {/* Free marketplace. */}
            <Engagement
              terms={t("marketplace.terms")}
              name={t("marketplace.name")}
              price={t("marketplace.price")}
              body={t("marketplace.body")}
              action={
                <Link className="b" href="/structure">
                  {t("marketplace.cta")}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              }
            />

            {/* Credits. The only thing on the platform that is paid for. */}
            <Engagement
              terms={t("credits.terms")}
              name={t("credits.name")}
              price={t("credits.price")}
              body={t("credits.body")}
              action={
                <Link className="b b--2" href="/verification">
                  {t("credits.cta")}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              }
            />

            {/* Success fee. */}
            <Engagement
              terms={t("desk.terms")}
              name={t("desk.name")}
              price={t("desk.price")}
              body={t("desk.body")}
              action={
                <Link className="b b--2" href="/contact?engagement=desk">
                  {t("desk.cta")}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              }
            />

            {/* Retainer. */}
            <Engagement
              terms={t("retainer.terms")}
              name={t("retainer.name")}
              price={t("retainer.price")}
              body={t("retainer.body")}
              action={
                <Link className="b b--2" href="/contact?engagement=retainer">
                  {t("retainer.cta")}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              }
            />
          </div>

          <p style={{ ...COPY, marginTop: 14, maxWidth: "72ch" }}>{t("footnote")}</p>
        </section>
      </DeskShell>
    </div>
  );
}
