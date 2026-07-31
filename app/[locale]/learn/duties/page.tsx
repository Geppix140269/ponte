import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { landingFontVars } from "@/components/home/landing/fonts";
import DeskShell from "@/components/desk/DeskShell";
import "@/components/desk/desk.css";

/**
 * Learn: import duties, on the Desk (Issue #130 Stage 3).
 *
 * This is one of the two public entrances search brings people to, and it was
 * still drawn by the retired obsidian chrome, so a reader who arrived from a
 * search result and then clicked anything landed in a different product. It now
 * renders the Desk shell, and it also stops nesting a second <main>: ChromeGate
 * drops the shared wrapper on a bared route, and DeskShell supplies the one
 * landmark.
 *
 * Every word, every figure, every worked example, both structured-data blocks
 * and both outgoing links are unchanged. This is a shell and a styling change.
 */

export const metadata: Metadata = {
  title: "Import Duties and Tariffs Explained: HS Codes, MFN Rates, FTAs",
  description:
    "A complete guide to import duties: how they are calculated, the six duty types (ad valorem, specific, compound, ADD, CVD, safeguard), MFN rates, FTA preferences, and how to minimise your landed cost legally.",
  alternates: { canonical: "/learn/duties" },
  openGraph: {
    title: "Import Duties and Tariffs Explained | Ponte Trade",
    description:
      "HS codes, MFN rates, anti-dumping duties, FTAs and landed cost, explained from first principles with worked examples.",
    url: "/learn/duties",
    siteName: "Ponte Trade",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Import Duties and Tariffs Explained: HS Codes, MFN Rates, FTAs",
    description:
      "Complete guide to import duties: how they work, the six types, FTA preferences, and legal cost reduction strategies.",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How is an import duty calculated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An import duty is calculated from three inputs: (1) the HS code, which determines the applicable duty rate; (2) the customs value, which is typically the CIF value of the goods (cost + insurance + freight to the port of destination); and (3) the duty rate itself, expressed as a percentage of the customs value (ad valorem) or as a fixed amount per unit. The duty payable equals the customs value multiplied by the ad valorem rate, plus any specific duty per unit where applicable.",
      },
    },
    {
      "@type": "Question",
      name: "What is an MFN tariff rate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MFN stands for Most Favoured Nation. The MFN rate is the standard import duty rate that WTO member countries apply to goods from all other WTO members unless a preferential trade agreement (FTA) provides a lower rate. With 164 WTO members, MFN rates apply to the vast majority of world trade. The MFN rate is the baseline, the starting point before FTA preferences or additional duties (anti-dumping, safeguards) are applied.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between ad valorem and specific duties?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ad valorem duties are expressed as a percentage of the customs value of the goods, for example 5% of the CIF value. They rise and fall with the price of the goods. Specific duties are expressed as a fixed monetary amount per unit of quantity, for example $0.68 per kilogram of sugar. Specific duties do not change with the price of the goods. Compound duties combine both: a percentage rate plus a fixed amount per unit.",
      },
    },
    {
      "@type": "Question",
      name: "What is an anti-dumping duty?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An anti-dumping duty (ADD) is an additional import tariff imposed on specific goods from specific countries where those goods are found to be exported at prices below their normal value (i.e., below the domestic price in the exporting country or below the cost of production). ADDs are on top of the standard MFN rate and can be very high, commonly 20 to 200%. They are product- and origin-specific: the same HS code imported from a different country will not be subject to the ADD.",
      },
    },
    {
      "@type": "Question",
      name: "How do free trade agreements reduce import duties?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free trade agreements (FTAs) create preferential tariff rates between member countries, typically 0% for qualifying goods. To benefit from an FTA rate, the goods must meet the 'rules of origin' requirements specified in the agreement. Rules of origin define how much of the product's content or transformation must occur within an FTA member country to qualify. Documentation requirements (typically a certificate of origin or exporter's declaration) must also be met at the time of import.",
      },
    },
    {
      "@type": "Question",
      name: "What is a landed cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The landed cost is the total cost of getting a product to its destination country, including: the cost of the goods (ex-works or FOB), international freight and insurance, import duty, VAT or GST applied on import, customs processing fees, and any other import-related charges (e.g., the US Harbor Maintenance Fee). Landed cost is the correct denominator for margin calculations, not just the purchase price of the goods.",
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
    { "@type": "ListItem", position: 3, name: "Import Duties Explained", item: "https://ponte.trade/learn/duties" },
  ],
};

const DUTY_TYPES = [
  {
    type: "Ad valorem",
    definition: "A percentage of the customs value of the goods.",
    example: "TV worth $500, 5% rate → $25 duty",
    where: "Most goods in most countries",
  },
  {
    type: "Specific",
    definition: "A fixed monetary amount per unit of quantity (weight, volume, number of items).",
    example: "$0.68/kg of sugar regardless of price",
    where: "Agricultural goods, alcoholic beverages, tobacco",
  },
  {
    type: "Compound",
    definition: "A combination of ad valorem and specific duties applied simultaneously.",
    example: "Footwear: 20% of value + $0.90/pair",
    where: "Footwear, certain textiles and agricultural products",
  },
  {
    type: "Anti-dumping (ADD)",
    definition: "An additional duty on goods exported below normal value (dumping). Applied on top of MFN rate.",
    example: "Chinese steel: MFN 3% + ADD 62.5% = 65.5% total",
    where: "Steel, aluminium, chemicals, consumer goods. Varies by country and product",
  },
  {
    type: "Countervailing (CVD)",
    definition: "A duty to offset government subsidies in the exporting country. Applied on top of MFN rate.",
    example: "Subsidised solar panels: MFN 2.5% + CVD 15% = 17.5%",
    where: "Any product where foreign subsidy is proven. Commonly solar, steel, agriculture",
  },
  {
    type: "Safeguard",
    definition: "A temporary duty imposed when a surge in imports threatens domestic industry.",
    example: "US washing machines: 20% safeguard duty for 3 years",
    where: "Typically short-term, any sector facing import surge. Politically driven",
  },
];

const FTAS = [
  { name: "USMCA", members: "US, Canada, Mexico", note: "Replaces NAFTA. Duty-free for qualifying goods. Automotive rules of origin require 75% regional value." },
  { name: "EU Single Market", members: "27 EU member states", note: "Zero duties on all intra-EU trade. Common External Tariff (CET) applies to imports from outside the EU." },
  { name: "RCEP", members: "15 Asia-Pacific nations incl. China, Japan, ASEAN", note: "World's largest FTA by trade volume. Gradual tariff elimination over 10-20 years depending on product." },
  { name: "CPTPP", members: "11 Pacific nations incl. Japan, Canada, Australia, Vietnam", note: "High-standard agreement. Eliminates tariffs on 95%+ of goods. UK acceded in 2023." },
  { name: "AfCFTA", members: "54 African Union member states", note: "Aims to eliminate 97% of tariff lines. Phased implementation, so check current schedules by member state." },
  { name: "UK-EU TCA", members: "UK and EU", note: "Zero tariffs on qualifying goods with UK or EU origin. Rules of origin require substantial transformation within the TCA area." },
];

const INPUTS = [
  { n: "01", label: "HS Code", body: "The Harmonised System code classifies your product and determines which duty rate applies. An incorrect classification can mean paying the wrong rate, higher or lower than the legal obligation." },
  { n: "02", label: "Customs value", body: "Usually the CIF value: cost of goods plus insurance plus freight to the port of destination. If you trade on FOB terms, the importer adds insurance and freight to derive CIF." },
  { n: "03", label: "Duty rate", body: "The applicable rate from the destination country's tariff schedule. May be MFN (standard), preferential (FTA), or a combination with ADD, CVD or safeguard duties on top." },
];

const LANDED = [
  { label: "VAT / GST on import", body: "Applied on the duty-inclusive customs value. UK: 20%. EU standard: varies 17-27%. Australia: 10% GST. US: no federal VAT." },
  { label: "Customs processing fee", body: "US: Merchandise Processing Fee (MPF) at 0.3464% of value, min $31.67. EU: no equivalent but broker fees apply." },
  { label: "Harbor Maintenance Fee (US)", body: "0.125% of cargo value on sea freight imports into US. Paid by importer." },
  { label: "Excise duties", body: "Additional consumption taxes on alcohol, tobacco, fuel, and certain goods. Applied at import by many countries." },
];

const EXAMPLE_ROWS = [
  { label: "MFN duty rate", value: "0% (laptops are duty-free under ITA)" },
  { label: "Section 301 tariff (China-specific)", value: "25% → $250" },
  { label: "Merchandise Processing Fee", value: "0.3464% → $3.46" },
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

const FINE: CSSProperties = { fontSize: 12, lineHeight: 1.55, color: "var(--ink-3)" };

const CHIP: CSSProperties = {
  background: "var(--sunken)",
  border: "1px solid var(--rule)",
  borderRadius: "var(--dk-radius-in)",
  padding: "7px 10px",
  fontSize: 11.5,
  color: "var(--ink)",
};

const ROW: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  padding: "9px 0",
  borderBottom: "1px solid var(--rule)",
  fontSize: 13,
  color: "var(--ink-2)",
};

const ROW_TOTAL: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  padding: "10px 0 0",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ink)",
};

const TABLE_WRAP: CSSProperties = {
  overflowX: "auto",
  border: "1px solid var(--rule)",
  borderRadius: "var(--dk-radius)",
  background: "var(--raised)",
};

const TABLE: CSSProperties = { width: "100%", borderCollapse: "collapse", minWidth: 620 };

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

const TD_NAME: CSSProperties = { ...TD, color: "var(--ink)", fontWeight: 600, whiteSpace: "nowrap" };

const ACTS: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 };

export default function LearnDutiesPage() {
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
              <span style={{ color: "var(--ink)" }}>Import Duties Explained</span>
            </nav>
            <p className="kicker">Trade intelligence fundamentals</p>
            <h1 className="serif" style={H1}>
              Import duties and tariffs explained, from HS codes to landed cost.
            </h1>
            <p style={LEAD}>
              Every import is subject to duty. Understanding how that duty is calculated,
              and how to legally minimise it, can determine whether a trade corridor is
              profitable. This guide covers everything from the basics to FTA optimisation.
            </p>
          </section>

          {/* The calculation */}
          <section className="sec" style={RULED}>
            <div className="sech">
              <div>
                <h2>How import duty is calculated</h2>
                <p className="d">
                  Every import duty calculation requires exactly three inputs:
                  the HS code, the customs value, and the applicable rate.
                </p>
              </div>
            </div>

            <div style={GRID}>
              {INPUTS.map((item) => (
                <div key={item.n} className="panel">
                  <div className="panel__h">
                    <b>{item.n}</b>
                  </div>
                  <div style={PANEL_BODY}>
                    <h3 style={SUB}>{item.label}</h3>
                    <p style={COPY}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Worked example */}
            <div className="panel" style={{ marginTop: 12, maxWidth: 720 }}>
              <div className="panel__h">
                <b>Worked example</b>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>
                  Laptop (HS 8471.30), customs value $1,000, imported China → US
                </p>
                {EXAMPLE_ROWS.map((row) => (
                  <div key={row.label} style={ROW}>
                    <span>{row.label}</span>
                    <span className="mono" style={{ color: "var(--ink)", textAlign: "right" }}>
                      {row.value}
                    </span>
                  </div>
                ))}
                <div style={ROW_TOTAL}>
                  <span>Total duty + fees on $1,000 shipment</span>
                  <span className="mono">$253.46</span>
                </div>
              </div>
            </div>
          </section>

          {/* MFN */}
          <section className="sec" style={RULED}>
            <div className="sech">
              <div>
                <h2>MFN rates: the WTO baseline</h2>
              </div>
            </div>
            <p style={PROSE}>
              The Most Favoured Nation (MFN) rate is the standard duty applied to imports
              from any WTO member country in the absence of a preferential trade agreement.
              With 164 WTO members, MFN rates cover the vast majority of global trade.
              Every country&apos;s MFN schedule is published and legally binding, so
              you can look up any rate for any HS code in any country. MFN is the
              starting point. Everything else, whether FTA preferences, anti-dumping or safeguards,
              is a modification of the MFN baseline.
            </p>
          </section>

          {/* Six duty types */}
          <section className="sec" style={RULED}>
            <div className="sech">
              <div>
                <h2>The six types of import duty</h2>
                <p className="d">
                  Not all duties work the same way. The type of duty determines how it
                  is calculated and what triggers it.
                </p>
              </div>
            </div>
            <div style={GRID}>
              {DUTY_TYPES.map((dt) => (
                <div key={dt.type} className="panel">
                  <div className="panel__h">
                    <b>{dt.type}</b>
                  </div>
                  <div style={PANEL_BODY}>
                    <p style={COPY}>{dt.definition}</p>
                    <p className="mono" style={CHIP}>
                      {dt.example}
                    </p>
                    <p style={FINE}>
                      <span style={{ color: "var(--ink-2)" }}>Common on: </span>
                      {dt.where}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FTAs */}
          <section className="sec" style={RULED}>
            <div className="sech">
              <div>
                <h2>Free trade agreements and preferential rates</h2>
                <p className="d">
                  An FTA creates a preferential tariff rate, often 0%, between member countries.
                  To benefit, your goods must satisfy the &ldquo;rules of origin&rdquo; requirement:
                  a minimum level of production or transformation must occur within an FTA member country.
                </p>
              </div>
            </div>

            <div className="panel" style={{ maxWidth: 720, marginBottom: 12 }}>
              <div className="panel__h">
                <b>FTA in practice</b>
              </div>
              <div style={{ padding: "14px 16px 16px" }}>
                <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
                  Brake pads (HS 8708.30) imported into the US
                </p>
                <dl className="factgrid">
                  <div>
                    <dt>From Mexico (USMCA qualifying)</dt>
                    <dd>0%</dd>
                  </div>
                  <div>
                    <dt>From China (MFN)</dt>
                    <dd>2.5%</dd>
                  </div>
                  <div>
                    <dt>From China (+ Section 301)</dt>
                    <dd>27.5%</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div style={TABLE_WRAP}>
              <table style={TABLE}>
                <thead>
                  <tr>
                    <th className="mono" style={TH} scope="col">Agreement</th>
                    <th className="mono" style={TH} scope="col">Members</th>
                    <th className="mono" style={TH} scope="col">Key notes</th>
                  </tr>
                </thead>
                <tbody>
                  {FTAS.map((fta) => (
                    <tr key={fta.name}>
                      <td style={TD_NAME}>{fta.name}</td>
                      <td style={TD}>{fta.members}</td>
                      <td style={TD}>{fta.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Beyond duties */}
          <section className="sec" style={RULED}>
            <div className="sech">
              <div>
                <h2>Beyond duties: the full landed cost</h2>
                <p className="d">
                  Import duty is only part of the landed cost. A complete landed cost calculation
                  must also include:
                </p>
              </div>
            </div>
            <div style={GRID}>
              {LANDED.map((item) => (
                <div key={item.label} className="panel">
                  <div style={PANEL_BODY}>
                    <h3 style={SUB}>{item.label}</h3>
                    <p style={COPY}>{item.body}</p>
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

          {/* CTA. This used to point at a duty calculator that was never built
              and a $299 report SKU from the retired shop: one 404 and one
              redirect. It now offers the two things that exist. */}
          <section className="sec" style={RULED}>
            <p className="kicker">Put it to work</p>
            <h2 className="serif" style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.016em", margin: "12px 0 10px", maxWidth: "24ch" }}>
              Know your landed cost before you commit.
            </h2>
            <p style={{ ...COPY, maxWidth: "58ch" }}>
              The desk works duty and landed-cost questions as part of any engagement, and the
              marketplace is where the counterparties are. Both start from the same place: tell us
              the product and the route.
            </p>
            <div style={ACTS}>
              <Link href="/contact" className="b b--lg">
                Ask the desk
              </Link>
              <Link href="/marketplace" className="b b--2 b--lg">
                See the board
              </Link>
            </div>
          </section>
        </DeskShell>
      </div>
    </>
  );
}
