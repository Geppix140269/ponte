import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import "@/components/desk/desk.css";

/**
 * Contact, on the Desk (Issue #130 Stage 3).
 *
 * The page a member reaches from the two paid engagements on /pricing, so it
 * was the second half of a journey that changed generation halfway through. It
 * now renders the same Desk shell as the page that sent them here.
 *
 * The two ways in are unchanged: post the deal yourself, or write to the desk.
 * The engagement lead, the mailto subject and both destinations are the same
 * strings and the same links as before.
 */

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "contact",
  });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: alternatesFor("/contact", params.locale),
  };
}

const HEAD: CSSProperties = {
  fontSize: "clamp(30px, 4.6vw, 46px)",
  lineHeight: 1.08,
  letterSpacing: "-0.022em",
  fontWeight: 500,
  margin: "14px 0 12px",
  maxWidth: "18ch",
};

const LEAD: CSSProperties = {
  fontSize: 16.5,
  lineHeight: 1.6,
  color: "var(--ink-2)",
  maxWidth: "64ch",
};

const GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
  alignItems: "stretch",
};

const CARD: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "18px 20px 20px",
  gap: 10,
};

const NAME: CSSProperties = { fontSize: 16, fontWeight: 600, lineHeight: 1.35 };

const COPY: CSSProperties = { fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-2)" };

const ACT: CSSProperties = { marginTop: "auto", paddingTop: 8 };

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { engagement?: string; product?: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("contact");

  // The Analyst Desk's strategy intensive went with /advisory. The retainer
  // did not: it is still an engagement on /pricing, so it still gets its own
  // opening line here.
  const key = searchParams.engagement ?? searchParams.product ?? "";
  const lead = key === "retainer" ? t("lead.retainer") : t("lead.default");

  return (
    <div className={`ponte-desk ${landingFontVars}`}>
      <DeskShell rail={null} objective={null}>
        <section className="sec">
          <p className="kicker">{t("pill")}</p>
          <h1 className="serif" style={HEAD}>
            {t("title")}
          </h1>
          <p style={LEAD}>{lead}</p>
        </section>

        <section className="sec">
          <div style={GRID}>
            <div className="panel" style={CARD}>
              <h2 style={NAME}>{t("deal.title")}</h2>
              <p style={COPY}>{t("deal.body")}</p>
              <div style={ACT}>
                <Link className="b" href="/marketplace">
                  {t("deal.cta")}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            <div className="panel" style={CARD}>
              <h2 style={NAME}>{t("email.title")}</h2>
              <p style={COPY}>{t("email.body")}</p>
              <div style={ACT}>
                <a
                  className="b b--2"
                  href={`mailto:hello@ponte.trade${
                    key ? `?subject=${encodeURIComponent(t("email.subject", { topic: key }))}` : ""
                  }`}
                >
                  hello@ponte.trade
                </a>
              </div>
            </div>
          </div>
        </section>
      </DeskShell>
    </div>
  );
}
