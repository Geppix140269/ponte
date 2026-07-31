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
 * Once the second half of a journey that began at one of two paid engagements
 * on /pricing. Both are retired: the strategy intensive with /advisory, and the
 * retainer on 31 July 2026 under PT-COMMERCIAL-2026-07-31-01 section 15
 * (PL-042). So the page no longer varies by engagement, and the ways in are the
 * two that survive: post the deal yourself, or write to the desk.
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
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("contact");

  // One opening line, because there is no longer a paid engagement to open on.
  //
  // The Analyst Desk's strategy intensive went with /advisory; the retainer
  // followed it on 31 July 2026, retired by PT-COMMERCIAL-2026-07-31-01
  // section 15 (PL-042). `searchParams` is gone with it: nothing varies by
  // engagement any more.
  //
  // A bookmarked or shared `/contact?engagement=retainer` still exists in the
  // world. It now lands on the ordinary page, which is the point - an unknown
  // query string must not be able to surface an offer Ponte no longer makes.
  const lead = t("lead.default");

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
                <Link className="b" href="/find">
                  {t("deal.cta")}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            <div className="panel" style={CARD}>
              <h2 style={NAME}>{t("email.title")}</h2>
              <p style={COPY}>{t("email.body")}</p>
              <div style={ACT}>
                {/*
                  A plain mailto. The subject used to be prefilled from the
                  engagement the member arrived on, and there is no longer an
                  engagement to name - a subject reading "Enquiry: retainer"
                  would announce the very offer PL-042 removed.
                */}
                <a className="b b--2" href="mailto:hello@ponte.trade">
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
