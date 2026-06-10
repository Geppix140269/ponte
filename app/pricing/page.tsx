import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Transparent pricing for every Ponte Trade product — from $199 quick briefs to full market entry strategies. No subscriptions. Buy once, own it.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing | Ponte Trade",
    description:
      "Transparent pricing for every Ponte Trade product. No subscriptions.",
    url: "/pricing",
    siteName: "Ponte Trade",
    type: "website",
  },
};

const TIERS = [
  {
    name: "Tier A",
    tagline: "Quick intelligence, fast decisions",
    delivery: "24-48 hours",
    colour: "border-gold/40 bg-gold/5",
    badge: "bg-gold/20 text-gold",
    products: [
      { sku: "CP-001", name: "Counterparty Screening Package", price: "$199", href: "/product/counterparty-screening-package", note: "Up to 25 entities, OFAC/EU/UK/UN lists" },
      { sku: "CT-001", name: "Country Trade Profile", price: "$249", href: "/product/country-trade-profile-report", note: "14-dimension country overview" },
      { sku: "MA-200", name: "AI Market Snapshot Report", price: "$299", href: "/product/ai-market-snapshot-report", note: "All 11 analysis dimensions, ADAMftd-powered", badge: "ADAMftd" },
      { sku: "MA-100", name: "Single Market Analysis Report", price: "$299", href: "/product/single-market-analysis-report", note: "One topic, one country, one analyst brief" },
      { sku: "CT-002", name: "Tariff & Landed Cost Brief", price: "$299", href: "/product/tariff-landed-cost-analysis", note: "Full duty calculation + mitigation matrix" },
      { sku: "CS-002", name: "Trade Company Deep Profile", price: "$349", href: "/product/trade-company-deep-profile", note: "One entity: volumes, partners, risk flags" },
      { sku: "GR-002", name: "Sanctions & Compliance Brief", price: "$349", href: "/product/sanctions-compliance-brief", note: "OFAC, EU, UK, UN screening + analyst commentary" },
      { sku: "MR-004", name: "Trade Corridor Report", price: "$399", href: "/product/trade-corridor-report", note: "5-year flows, operators, ports" },
      { sku: "TI-001", name: "Tender Intelligence Brief", price: "$399", href: "/product/government-tender-intelligence-brief", note: "Active tenders matched to your HS code" },
      { sku: "CT-003", name: "FTA Routing Analysis", price: "$499", href: "/product/fta-routing-analysis", note: "Origin-rules check + duty saving quantified" },
      { sku: "GR-001", name: "Geopolitical Scenario Brief", price: "$499", href: "/product/geopolitical-scenario-brief", note: "Chokepoint exposure + mitigation playbook" },
      { sku: "GR-003", name: "Hormuz Oil Shock Scenario", price: "$599", href: "/product/hormuz-oil-shock-scenario-report", note: "World-exclusive 4-scenario HS-6 shock model", badge: "Exclusive" },
    ],
  },
  {
    name: "Tier B",
    tagline: "Strategic reports, board-ready",
    delivery: "48-96 hours",
    colour: "border-steel/40 bg-steel/5",
    badge: "bg-steel/20 text-cream",
    products: [
      { sku: "MA-300", name: "Complete Market Analysis Suite", price: "$899", href: "/product/complete-market-analysis-suite", note: "All 11 modules + executive synthesis narrative" },
      { sku: "GR-004", name: "Supply Chain Risk Assessment", price: "$899", href: "/product/supply-chain-risk-assessment", note: "End-to-end risk map + mitigation roadmap" },
      { sku: "MR-001", name: "Single Country Market Report", price: "$1,099", href: "/product/single-country-market-report", note: "40+ page analyst report, one HS code + country" },
      { sku: "MR-002", name: "Multi-Country Comparative Strategy", price: "$1,599", href: "/product/multi-country-comparative-analysis", note: "3-5 countries ranked, one HS code" },
    ],
  },
  {
    name: "Bundles",
    tagline: "Integrated intelligence, one price",
    delivery: "48h to 5 days",
    colour: "border-amber-500/30 bg-amber-500/5",
    badge: "bg-amber-500/20 text-amber-400",
    products: [
      { sku: "BU-004", name: "Compliance Essentials Pack", price: "$749", href: "/product/compliance-essentials-pack", note: "Sanctions Brief + 25-entity screening", saving: "Save $99" },
      { sku: "BU-002", name: "Trade Intelligence Pack", price: "$799", href: "/product/trade-intelligence-pack", note: "Market Snapshot + Corridor + Tariff Brief", saving: "Save $198" },
    ],
  },
  {
    name: "Tier C",
    tagline: "White-glove and custom engagements",
    delivery: "Scoped on request",
    colour: "border-white/20 bg-white/[0.03]",
    badge: "bg-white/10 text-cream",
    products: [
      { sku: "CR-003", name: "Sector Quarterly Outlook", price: "from $4,999/yr", href: "/product/sector-quarterly-outlook", note: "Four outlooks/year, co-branded, member licence" },
    ],
  },
] as const;

const SUBSCRIPTIONS = [
  { sku: "TI-002", name: "Weekly Tender Digest", price: "$79/mo", href: "/product/weekly-tender-digest", note: "Curated tender alerts by HS code, 190+ countries. Cancel any time." },
] as const;

const PRINCIPLES = [
  { icon: "01", title: "Buy once, own it", body: "Every report ships with a single-organisation licence. No renewal, no platform lock-in. The PDF is yours." },
  { icon: "02", title: "Card held, not charged", body: "Your card is held at checkout. You are only charged when a senior analyst signs off your report." },
  { icon: "03", title: "USD pricing", body: "All Tier A, B and Bundle products are priced in USD. Tier C engagements are quoted in your preferred currency." },
  { icon: "04", title: "No subscriptions by default", body: "The digest products are month-to-month and cancel any time. Everything else is a one-off purchase." },
] as const;

export default function PricingPage() {
  return (
    <main className="pb-24">
      <section className="container-px pt-16 pb-12">
        <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-gold">
          Transparent pricing
        </p>
        <h1 className="heading-xl mb-4 max-w-2xl">
          Intelligence priced for the decision it enables.
        </h1>
        <p className="body-lg max-w-xl text-muted">
          Every product is a one-off, analyst-curated PDF. No platform login
          required after purchase. No subscriptions. Prices in USD.
        </p>
      </section>

      <section className="container-px space-y-8">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={"rounded-xl border p-6 md:p-8 " + tier.colour}
          >
            <div className="mb-6 flex flex-wrap items-start gap-3">
              <span
                className={"rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest " + tier.badge}
              >
                {tier.name}
              </span>
              <div>
                <p className="text-sm font-medium text-cream">{tier.tagline}</p>
                <p className="text-xs text-muted">Delivery: {tier.delivery}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tier.products.map((p) => (
                <Link
                  key={p.sku}
                  href={p.href}
                  className="group relative flex flex-col gap-1 rounded-lg border border-white/10 bg-navy/40 p-4 transition-colors hover:border-gold/40"
                >
                  {"badge" in p && p.badge && (
                    <span className="absolute right-3 top-3 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
                      {p.badge}
                    </span>
                  )}
                  {"saving" in p && p.saving && (
                    <span className="absolute right-3 top-3 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      {p.saving}
                    </span>
                  )}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[11px] text-muted">{p.sku}</span>
                    <span className="text-sm font-semibold text-gold">{p.price}</span>
                  </div>
                  <p className="text-sm font-medium text-cream group-hover:text-white">
                    {p.name}
                  </p>
                  <p className="text-xs text-muted">{p.note}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="container-px mt-8">
        <h2 className="mb-4 text-[11px] uppercase tracking-[0.2em] text-muted">
          Subscriptions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SUBSCRIPTIONS.map((s) => (
            <Link
              key={s.sku}
              href={s.href}
              className="group flex flex-col gap-1 rounded-lg border border-white/10 bg-navy/40 p-4 transition-colors hover:border-gold/40"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11px] text-muted">{s.sku}</span>
                <span className="text-sm font-semibold text-gold">{s.price}</span>
              </div>
              <p className="text-sm font-medium text-cream group-hover:text-white">{s.name}</p>
              <p className="text-xs text-muted">{s.note}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-px mt-16">
        <h2 className="mb-8 text-[11px] uppercase tracking-[0.2em] text-gold">
          How pricing works
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((pr) => (
            <div key={pr.icon} className="space-y-2">
              <span className="font-mono text-2xl font-bold text-gold/40">{pr.icon}</span>
              <h3 className="text-sm font-semibold text-cream">{pr.title}</h3>
              <p className="text-xs leading-relaxed text-muted">{pr.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-px mt-16 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link href="/catalogue" className="btn-primary">
          Browse full catalogue
        </Link>
        <Link href="/why-ponte" className="btn-ghost text-sm">
          Why Ponte Trade
        </Link>
      </section>
    </main>
  );
}
