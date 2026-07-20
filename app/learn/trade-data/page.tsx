import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What Is Trade Data? Transaction-Level Customs Intelligence Explained",
  description:
    "Transaction-level trade data reveals the actual shipments behind global trade flows — importer, exporter, HS code, quantity and unit price from real customs declarations. Learn what it is, where it comes from, and how to use it.",
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
      "Transaction-level customs data vs. aggregated statistics — what it is, where it comes from, how to use it.",
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
        text: "UN Comtrade provides aggregated statistics: the total value of a country's exports or imports of a given HS code in a given year. Transaction-level trade data shows you the individual shipments that make up those totals — including the actual company names, quantities per shipment, and unit prices. Statistical data answers 'how much was traded'; transaction data answers 'who traded what, with whom, at what price, and when'.",
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
        text: "The EU operates as a single customs territory. Goods moving between EU member states — say, from Germany to France — cross no customs border and therefore generate no customs declaration. This means there is no transaction-level data for intra-EU trade. EU imports from outside the bloc (e.g., China to Germany) do generate customs declarations, but these are not published at transaction level in most EU member states. Ponte uses price extrapolation methodology to estimate unit values on these routes.",
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
  { region: "Intra-EU Trade", level: "Limited", note: "No customs declarations between member states — extrapolated" },
  { region: "China (exports)", level: "Limited", note: "Export declarations not published at transaction level" },
  { region: "Japan / South Korea", level: "Limited", note: "Aggregated data only; no named-party records" },
  { region: "Australia / New Zealand", level: "Limited", note: "Restricted publication of named-party data" },
];

const USE_CASES = [
  {
    title: "Find verified suppliers",
    body: "Identify which companies are actively exporting your product category, the volumes they handle, and who their existing customers are — all from actual shipment records, not self-reported directories.",
  },
  {
    title: "Benchmark your pricing",
    body: "Unit values from customs declarations reveal what buyers are actually paying — not list prices, but the CIF or FOB values declared at the border. Essential for pricing strategy and contract negotiation.",
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
    body: "Identify active buyers in your target market — companies already importing your product category — and approach them with a credible, data-backed pitch.",
  },
  {
    title: "Due diligence on counterparties",
    body: "Verify that a counterparty is a genuine trading entity by checking their shipment history, known trading partners, and typical volumes before signing a contract.",
  },
];

export default function LearnTradeDataPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]) }}
      />
      <main className="pb-24">
        {/* Hero */}
        <section className="container-px pt-16 pb-12">
          <nav className="mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
            <Link href="/" className="hover:text-gold transition-colors">Home</Link>
            <span className="text-white/20">/</span>
            <span>Learn</span>
            <span className="text-white/20">/</span>
            <span className="text-cream">What Is Trade Data?</span>
          </nav>
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-gold">
            Trade intelligence fundamentals
          </p>
          <h1 className="heading-xl mb-6 max-w-3xl">
            What is transaction-level trade data — and why does it matter?
          </h1>
          <p className="body-lg max-w-2xl text-muted">
            Behind every trade statistic is a customs declaration: a record of
            exactly who shipped what, to whom, at what price. Transaction-level
            trade data makes those records searchable. Here is what it is,
            where it comes from, and what you can do with it.
          </p>
        </section>

        {/* The critical difference */}
        <section className="container-px py-12 border-t border-white/10">
          <h2 className="heading-lg mb-6 max-w-2xl">
            Statistical data vs. transaction-level data
          </h2>
          <p className="body-md text-muted max-w-2xl mb-8">
            Most publicly available trade data — UN Comtrade, World Bank WITS,
            Eurostat — is <strong className="text-cream">aggregated statistical data</strong>.
            It tells you how much was traded between two countries in a given year.
            Transaction-level data is different: it shows you the individual shipments
            that make up those totals.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
            <div className="rounded-xl border border-white/20 bg-steel/20 p-6">
              <p className="text-[11px] uppercase tracking-widest text-muted mb-3">Statistical data tells you</p>
              <p className="text-cream text-lg font-medium leading-snug">
                &ldquo;Vietnam exported $2.3bn of footwear to the US in 2024.&rdquo;
              </p>
            </div>
            <div className="rounded-xl border border-gold/40 bg-gold/5 p-6">
              <p className="text-[11px] uppercase tracking-widest text-gold mb-3">Transaction data tells you</p>
              <p className="text-cream text-lg font-medium leading-snug">
                &ldquo;Nike Inc. imported 42,000 pairs from Pou Chen Corp at $18.50/pair
                on 15 March 2024, via Ho Chi Minh City to Los Angeles.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* Where it comes from */}
        <section className="container-px py-12 border-t border-white/10">
          <h2 className="heading-lg mb-4 max-w-2xl">Where the data comes from</h2>
          <p className="body-md text-muted max-w-2xl mb-6">
            Transaction-level trade data originates from two primary document types:
          </p>
          <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mb-8">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-cream uppercase tracking-wider">Customs declarations</h3>
              <p className="text-sm text-muted leading-relaxed">
                Filed with national customs authorities at the point of import or export.
                Contains: HS classification, declared value, quantity, weight, country of origin,
                importer and exporter names (where published).
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-cream uppercase tracking-wider">Bills of lading</h3>
              <p className="text-sm text-muted leading-relaxed">
                Filed with port authorities for sea freight. Contains: shipper, consignee,
                description of goods, port of loading, port of discharge, vessel name,
                container numbers, and cargo weight.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-navy/40 p-6 max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gold mb-2">Ponte&apos;s data engine</p>
            <p className="text-sm text-muted leading-relaxed">
              Ponte&apos;s research is grounded in{" "}
              <strong className="text-cream">transaction-level trade evidence</strong> across
              199 countries. Every finding passes a 5-step verification pipeline: 4-source pull,
              conflict detection, Monte Carlo resolution, and senior-analyst sign-off before
              delivery.
            </p>
          </div>
        </section>

        {/* Coverage map */}
        <section className="container-px py-12 border-t border-white/10">
          <h2 className="heading-lg mb-4 max-w-2xl">Coverage by region</h2>
          <p className="body-md text-muted max-w-2xl mb-8">
            Data quality varies significantly by country. The following table shows
            coverage strength and key notes for major trading regions.
          </p>
          <div className="overflow-x-auto max-w-3xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 pr-6 text-[11px] uppercase tracking-wider text-muted font-medium">Region</th>
                  <th className="text-left py-3 pr-6 text-[11px] uppercase tracking-wider text-muted font-medium">Coverage</th>
                  <th className="text-left py-3 text-[11px] uppercase tracking-wider text-muted font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {COVERAGE.map((row) => (
                  <tr key={row.region} className="border-b border-white/[0.06]">
                    <td className="py-3 pr-6 text-cream font-medium">{row.region}</td>
                    <td className="py-3 pr-6">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${row.level === "Strong" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                        {row.level}
                      </span>
                    </td>
                    <td className="py-3 text-muted text-xs leading-relaxed">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted max-w-2xl">
            For routes with limited direct coverage, Ponte uses price extrapolation methodology
            — deriving unit values from comparable origin-destination pairs with strong data coverage.
            All extrapolated values are flagged in reports.
          </p>
        </section>

        {/* Use cases */}
        <section className="container-px py-12 border-t border-white/10">
          <h2 className="heading-lg mb-4 max-w-2xl">What you can do with trade data</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className="space-y-2">
                <h3 className="text-sm font-semibold text-cream">{uc.title}</h3>
                <p className="text-xs leading-relaxed text-muted">{uc.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="container-px py-12 border-t border-white/10">
          <h2 className="heading-lg mb-8 max-w-2xl">Frequently asked questions</h2>
          <div className="max-w-3xl space-y-8">
            {faqJsonLd.mainEntity.map((item) => (
              <div key={item.name} className="space-y-2">
                <h3 className="text-sm font-semibold text-cream">{item.name}</h3>
                <p className="text-sm text-muted leading-relaxed">{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container-px py-12 border-t border-white/10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold mb-3">Ready to use it</p>
          <h2 className="heading-lg mb-4 max-w-xl">
            Put this kind of evidence behind your next deal.
          </h2>
          <p className="text-sm text-muted max-w-lg mb-6">
            Bring a live offer or requirement to the Deal Desk, or book a
            senior analyst when a decision needs evidence first.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/marketplace" className="btn-primary">
              Visit the marketplace
            </Link>
            <Link href="/learn/duties" className="btn-ghost text-sm">
              Learn about import duties
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
