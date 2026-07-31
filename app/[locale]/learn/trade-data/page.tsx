import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import "@/components/desk/desk.css";

/**
 * Learn: what trade data is, on the Desk (Issue #130 Stage 3).
 *
 * The sister article to /learn/duties, migrated with it for the same reason:
 * both are public entrances, and both were still drawn by the retired obsidian
 * chrome. Like its sister it also stops nesting a second <main>.
 *
 * Every word, both structured-data blocks, the coverage table and both outgoing
 * links are unchanged. Coverage strength was previously drawn in emerald and
 * amber; it is now stated in the reserved state tokens, and it was already, and
 * still is, carried by the word "Strong" or "Limited" rather than by colour.
 */

export const metadata: Metadata = {
  title: "What Is Trade Data? Transaction-Level Customs Intelligence Explained",
  description:
    "Transaction-level trade data reveals the actual shipments behind global trade flows: importer, exporter, HS code, quantity and unit price from real customs declarations. Learn what it is, where it comes from, and how to use it.",
  alternates: { canonical: "/learn/trade-data" },
  openGraph: {
    title: "What Is Trade Data? | Ponte Trade",
    description:
      "Transaction-level customs data vs. aggregated statistics: the critical difference, coverage map, and use cases explained.",
    url: "/learn/trade-data",
    siteName: "Ponte Trade",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Is Trade Data? Transaction-Level Customs Intelligence Explained",
    description:
      "Transaction-level customs data vs. aggregated statistics. What it is, where it comes from, how to use it.",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is transaction-level trade data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Transaction-level trade data is a record of individual import or export shipments drawn from customs declarations and bills of lading. Each record captures: importer name, exporter name, HS code, product description, quantity, unit value, port of loading, port of discharge, and shipment date. This is fundamentally different from statistical trade data, which aggregates those transactions into country-level totals.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between trade data and UN Comtrade data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "UN Comtrade provides aggregated statistics: the total value of a country's exports or imports of a given HS code in a given year. Transaction-level trade data shows you the individual shipments that make up those totals, including the actual company names, quantities per shipment, and unit prices. Statistical data answers 'how much was traded'; transaction data answers 'who traded what, with whom, at what price, and when'.",
      },
    },
    {
      "@type": "Question",
      name: "Where does customs trade data come from?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Customs trade data originates from two primary sources: customs declarations filed with national customs authorities at the point of import or export, and bills of lading filed with port authorities. Coverage quality varies significantly by country. The US, India, Mexico, Brazil, Vietnam, and most of Latin America and Africa publish high-quality transaction-level data. The EU does not publish intra-EU trade at transaction level because there are no customs declarations for goods moving between EU member states.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use trade data to find suppliers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Transaction-level trade data is one of the most reliable methods for finding verified suppliers. Because the data originates from actual customs declarations, you can identify which companies are actively exporting a specific product (by HS code), the countries they ship from, their typical shipment volumes, and who their existing customers are. This is far more reliable than trade directories, which are self-reported and often outdated.",
      },
    },
    {
      "@type": "Question",
      name: "Why is there no transaction-level trade data for the EU?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The EU operates as a single customs territory. Goods moving between EU member states, say from Germany to France, cross no customs border and therefore generate no customs declaration. This means there is no transaction-level data for intra-EU trade. EU imports from outside the bloc (e.g., China to Germany) do generate customs declarations, but these are not published at transaction level in most EU member states. Ponte uses price extrapolation methodology to estimate unit values on these routes.",
      },
    },
  ],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ponte.trade" },
    { "@type": "ListItem", position: 2, name: "Learn", item: "https://ponte.trade/learn" },
    { "@type": "ListItem", position: 3, name: "What Is Trade Data?", item: "https://ponte.trade/learn/trade-data" },
  ],
};

const COVERAGE = [
  { region: "United States", level: "Strong", note: "Full bill-of-lading data, importer/exporter names, unit values" },
  { region: "India", level: "Strong", note: "Import and export declarations, named parties" },
  { region: "Mexico", level: "Strong", note: "Import declarations, named importers" },
  { region: "Brazil", level: "Strong", note: "Import declarations, named parties, unit values" },
  { region: "Vietnam", level: "Strong", note: "Import and export data, named parties" },
  { region: "Sub-Saharan Africa", level: "Strong", note: "Most countries publish declaration-level data" },
  { region: "Latin America", level: "Strong", note: "Most countries publish declaration-level data" },
  { region: "Intra-EU Trade", level: "Limited", note: "No customs declarations between member states, so extrapolated" },
  { region: "China (exports)", level: "Limited", note: "Export declarations not published at transaction level" },
  { region: "Japan / South Korea", level: "Limited", note: "Aggregated data only; no named-party records" },
  { region: "Australia / New Zealand", level: "Limited", note: "Restricted publication of named-party data" },
];

const USE_CASES = [
  {
    title: "Find verified suppliers",
    body: "Identify which companies are actively exporting your product category, the volumes they handle, and who their existing customers are, all from actual shipment records, not self-reported directories.",
  },
  {
    title: "Benchmark your pricing",
    body: "Unit values from customs declarations reveal what buyers are actually paying: not list prices, but the CIF or FOB values declared at the border. Essential for pricing strategy and contract negotiation.",
  },
  {
    title: "Map trade corridors",
    body: "See exactly which routes carry your product: origin ports, destination ports, dominant operators, and seasonal flow patterns over 5+ years of shipment history.",
  },
  {
    title: "Competitive intelligence",
    body: "Determine which suppliers your competitors are buying from, at what volumes and approximate prices. Transaction data makes supply chain relationships visible.",
  },
  {
    title: "Market entry prospecting",
    body: "Identify active buyers in your target market, companies already importing your product category, and approach them with a credible, data-backed pitch.",
  },
  {
    title: "Due diligence on counterparties",
    body: "Verify that a counterparty is a genuine trading entity by checking their shipment history, known trading partners, and typical volumes before signing a contract.",
  },
];

const SOURCES = [
  {
    title: "Customs declarations",
    body: "Filed with national customs authorities at the point of import or export. Contains: HS classification, declared value, quantity, weight, country of origin, importer and exporter names (where published).",
  },
  {
    title: "Bills of lading",
    body: "Filed with port authorities for sea freight. Contains: shipper, consignee, description of goods, port of loading, port of discharge, vessel name, container numbers, and cargo weight.",
  },
];

// ---------------------------------------------------------------------------
// Presentation. Every value below is either a layout measure or a Desk token;
// no literal colour appears in this file.
// ---------------------------------------------------------------------------

const RULED: CSSProperties = { borderTop: "1px solid var(--rule)", paddingTop: 26 };

const H1: CSSProperties = {
  fontSize: "clamp(30px, 4.6vw, 46px)",
  lineHeight: 1.08,
  letterSpacing: "-0.022em",
  fontWeight: 500,
  margin: "14px 0 14px",
  maxWidth: "22ch",
};

const LEAD: CSSProperties = { fontSize: 16, lineHeight: 1.65, color: "var(--ink-2)", maxWidth: "66ch" };

const PROSE: CSSProperties = { fontSize: 14, lineHeight: 1.7, color: "var(--ink-2)", maxWidth: "74ch" };

const GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 12,
  alignItems: "stretch",
};

const PANEL_BODY: CSSProperties = { padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 };

const SUB: CSSProperties = { fontSize: 14, fontWeight: 600, lineHeight: 1.35 };

const COPY: CSSProperties = { fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" };

const QUOTE: CSSProperties = {
  fontSize: 17,
  fontWeight: 500,
  lineHeight: 1.4,
  color: "var(--ink)",
};

const TABLE_WRAP: CSSProperties = {
  overflowX: "auto",
  border: "1px solid var(--rule)",
  borderRadius: "var(--dk-radius)",
  background: "var(--raised)",
};

const TABLE: CSSProperties = { width: "100%", borderCollapse: "collapse", minWidth: 580 };

const TH: CSSProperties = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 600,
  color: "var(--ink-3)",
  background: "var(--sunken)",
  borderBottom: "1px solid var(--rule-strong)",
};

const TD: CSSProperties = {
  padding: "11px 16px",
  fontSize: 13,
  lineHeight: 1.6,
  color: "var(--ink-2)",
  borderBottom: "1px solid var(--rule)",
  verticalAlign: "top",
};

const TD_NAME: CSSProperties = { ...TD, color: "var(--ink)", fontWeight: 600 };

/**
 * Coverage strength. `Strong` is a reached state and `Limited` is a halted one,
 * so they take the reserved --pos and --review tokens rather than a decorative
 * green and amber. The word is still the carrier; the colour only agrees.
 */
function coverageChip(level: string): CSSProperties {
  const strong = level === "Strong";
  return {
    display: "inline-block",
    padding: "2px 9px",
    borderRadius: 999,
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontWeight: 600,
    whiteSpace: "nowrap",
    color: strong ? "var(--pos)" : "var(--review)",
    background: strong ? "var(--pos-tint)" : "var(--review-tint)",
    border: `1px solid ${strong ? "var(--pos-line)" : "var(--review-line)"}`,
  };
}

const ACTS: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 };

export default function LearnTradeDataPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]) }}
      />
      <div className={`ponte-desk ${landingFontVars}`}>
        <DeskShell rail={null} objective={null}>
          {/* Hero */}
          <section className="sec">
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <span>Learn</span>
              <span aria-hidden="true">/</span>
              <span style={{ color: "var(--ink)" }}>What Is Trade Data?</span>
            </nav>
            <p className="kicker">Trade intelligence fundamentals</p>
            <h1 className="serif" style={H1}>
              What is transaction-level trade data, and why does it matter?
            </h1>
            <p style={LEAD}>
              Behind every trade statistic is a customs declaration: a record of
              exactly who shipped what, to whom, at what price. Transaction-level
              trade data makes those records searchable. Here is what it is,
              where it comes from, and what you can do with it.
            </p>
          </section>

          {/* The critical difference */}
          <section className="sec" style={RULED}>
            <div className="sech">
              <div>
                <h2>Statistical data vs. transaction-level data</h2>
              </div>
            </div>
            <p style={{ ...PROSE, marginBottom: 14 }}>
              Most publicly available trade data, whether UN Comtrade, World Bank WITS
              or Eurostat, is{" "}
              <strong style={{ color: "var(--ink)", fontWeight: 600 }}>aggregated statistical data</strong>.
              It tells you how much was traded between two countries in a given year.
              Transaction-level data is different: it shows you the individual shipments
              that make up those totals.
            </p>

            <div style={{ ...GRID, maxWidth: 860 }}>
              <div className="panel">
                <div className="panel__h">
                  <b>Statistical data tells you</b>
                </div>
                <div style={PANEL_BODY}>
                  <p style={QUOTE}>
                    &ldquo;Vietnam exported $2.3bn of footwear to the US in 2024.&rdquo;
                  </p>
                </div>
              </div>
              <div className="panel">
                <div className="panel__h">
                  <b>Transaction data tells you</b>
                </div>
                <div style={PANEL_BODY}>
                  <p style={QUOTE}>
                    &ldquo;Nike Inc. imported 42,000 pairs from Pou Chen Corp at $18.50/pair
                    on 15 March 2024, via Ho Chi Minh City to Los Angeles.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Where it comes from */}
          <section className="sec" style={RULED}>
            <div className="sech">
              <div>
                <h2>Where the data comes from</h2>
                <p className="d">
                  Transaction-level trade data originates from two primary document types:
                </p>
              </div>
            </div>
            <div style={{ ...GRID, maxWidth: 860, marginBottom: 12 }}>
              {SOURCES.map((source) => (
                <div key={source.title} className="panel">
                  <div style={PANEL_BODY}>
                    <h3 style={SUB}>{source.title}</h3>
                    <p style={COPY}>{source.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="panel" style={{ maxWidth: 720 }}>
              <div className="panel__h">
                <b>Ponte&apos;s data engine</b>
              </div>
              <div style={PANEL_BODY}>
                <p style={COPY}>
                  Ponte&apos;s research is grounded in{" "}
                  <strong style={{ color: "var(--ink)", fontWeight: 600 }}>
                    transaction-level trade evidence
                  </strong>{" "}
                  across 199 countries. Every finding passes a 5-step verification pipeline: 4-source pull,
                  conflict detection, Monte Carlo resolution, and senior-analyst sign-off before
                  delivery.
                </p>
              </div>
            </div>
          </section>

          {/* Coverage map */}
          <section className="sec" style={RULED}>
            <div className="sech">
              <div>
                <h2>Coverage by region</h2>
                <p className="d">
                  Data quality varies significantly by country. The following table shows
                  coverage strength and key notes for major trading regions.
                </p>
              </div>
            </div>
            <div style={TABLE_WRAP}>
              <table style={TABLE}>
                <thead>
                  <tr>
                    <th className="mono" style={TH} scope="col">Region</th>
                    <th className="mono" style={TH} scope="col">Coverage</th>
                    <th className="mono" style={TH} scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {COVERAGE.map((row) => (
                    <tr key={row.region}>
                      <td style={TD_NAME}>{row.region}</td>
                      <td style={TD}>
                        <span className="mono" style={coverageChip(row.level)}>
                          {row.level}
                        </span>
                      </td>
                      <td style={TD}>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ ...COPY, marginTop: 12, maxWidth: "74ch" }}>
              For routes with limited direct coverage, Ponte uses price extrapolation methodology,
              deriving unit values from comparable origin-destination pairs with strong data coverage.
              All extrapolated values are flagged in reports.
            </p>
          </section>

          {/* Use cases */}
          <section className="sec" style={RULED}>
            <div className="sech">
              <div>
                <h2>What you can do with trade data</h2>
              </div>
            </div>
            <div style={GRID}>
              {USE_CASES.map((uc) => (
                <div key={uc.title} className="panel">
                  <div style={PANEL_BODY}>
                    <h3 style={SUB}>{uc.title}</h3>
                    <p style={COPY}>{uc.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="sec" style={RULED}>
            <div className="sech">
              <div>
                <h2>Frequently asked questions</h2>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: "74ch" }}>
              {faqJsonLd.mainEntity.map((item) => (
                <div key={item.name}>
                  <h3 style={{ ...SUB, marginBottom: 6 }}>{item.name}</h3>
                  <p style={PROSE}>{item.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="sec" style={RULED}>
            <p className="kicker">Ready to use it</p>
            <h2 className="serif" style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.016em", margin: "12px 0 10px", maxWidth: "24ch" }}>
              Put this kind of evidence behind your next deal.
            </h2>
            <p style={{ ...COPY, maxWidth: "58ch" }}>
              Bring a live offer or requirement to the Deal Desk, or book a
              senior analyst when a decision needs evidence first.
            </p>
            <div style={ACTS}>
              <Link href="/marketplace" className="b b--lg">
                Visit the marketplace
              </Link>
              <Link href="/learn/duties" className="b b--2 b--lg">
                Learn about import duties
              </Link>
            </div>
          </section>
        </DeskShell>
      </div>
    </>
  );
}
