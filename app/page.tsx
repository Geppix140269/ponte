import Link from "next/link";
import {
  ArrowRight,
  FileText,
  BarChart3,
  Layers,
  Globe2,
  Building2,
  Sparkles,
  Lock,
  Compass,
  Users,
  ShieldAlert,
  Rocket,
  FileSearch,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import NewsletterSignup from "@/components/NewsletterSignup";
import { BridgeMark } from "@/components/Logo";
import { featuredProducts } from "@/lib/catalogue-db";

export const revalidate = 60;

const trust = [
  "7B+ verified trade records",
  "199 country profiles",
  "Delivery date confirmed at checkout",
  "Grounded AI, not guesswork",
];

// Category names match lib/catalogue.ts CATEGORIES exactly — keep them in sync.
const browse = [
  { slug: "market-reports", name: "Market Reports", icon: FileText },
  { slug: "analysis", name: "Market Analysis", icon: BarChart3 },
  { slug: "bundles", name: "Intelligence Bundles", icon: Layers },
  { slug: "geopolitical", name: "Geopolitical & Risk", icon: Globe2 },
  { slug: "company-supplier", name: "Company & Supplier", icon: Building2 },
  { slug: "custom-research", name: "Custom Research", icon: Sparkles },
];

// Guided entry points — turns 40 SKUs into a "start from your goal" choice.
const useCases = [
  {
    icon: Compass,
    title: "I'm entering a new market",
    body: "Check readiness: SWOT, entry barriers, packaging and standards.",
    href: "/product/market-entry-bundle",
    cta: "Market Entry Bundle",
  },
  {
    icon: Users,
    title: "I need buyers or suppliers",
    body: "Get a ranked, contactable shortlist for your HS code.",
    href: "/product/buyers-by-hs-code",
    cta: "Buyers & Suppliers by HS Code",
  },
  {
    icon: ShieldAlert,
    title: "I'm assessing trade risk",
    body: "Sanctions screening, chokepoint exposure and conflict scenarios.",
    href: "/category/geopolitical",
    cta: "Geopolitical & Risk",
  },
  {
    icon: Rocket,
    title: "I want the full picture",
    body: "A market report plus entry analysis for one product and market.",
    href: "/product/export-launchpad",
    cta: "Export Launchpad",
  },
];

// Factual authority signals.
const trustPoints = [
  {
    icon: FileSearch,
    title: "Verified against official sources",
    body: "Every report is cross-checked against UN Comtrade, the World Bank, WTO, Eurostat, ITC and EU Taxud.",
  },
  {
    icon: ShieldCheck,
    title: "Grounded AI, with human QA",
    body: "Built on a grounded-AI engine and 7B+ verified trade records, then manually quality-checked by a sector specialist before delivery.",
  },
  {
    icon: BadgeCheck,
    title: "Backed by ICTTM",
    body: "Ponte Trade is owned by the International Centre for Trade Transparency, the UK group behind the engine that produces our reports.",
  },
];

const steps = [
  {
    n: "i.",
    title: "Choose your report",
    body: "Browse the catalogue and pick the intelligence you need.",
  },
  {
    n: "ii.",
    title: "Configure it",
    body: "Add your HS code, country, or product. We tailor the report to your question.",
  },
  {
    n: "iii.",
    title: "Pay once. Receive your PDF.",
    body: "Card held at checkout. Charged when we start production on your confirmed slot. Delivered to your inbox.",
  },
];

export default async function HomePage() {
  const featured = await featuredProducts();

  return (
    <>
      {/* ============ HERO ============ */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16 relative">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
          <div>
            <span className="pill">Trade Intelligence · Delivered</span>
            <h1
              className="serif text-white mt-6 mb-7"
              style={{
                fontWeight: 400,
                fontSize: "clamp(48px, 7vw, 92px)",
                lineHeight: 0.98,
                letterSpacing: "-0.015em",
              }}
            >
              Evidence{" "}
              <em className="text-gold italic" style={{ fontWeight: 400 }}>
                over
              </em>
              <br />
              opinion.
            </h1>
            <p className="text-[18px] text-gray-2 leading-relaxed max-w-xl mb-9">
              Research-grade market reports and risk analysis for exporters,
              importers and trade bodies. Built on a grounded-AI engine and
              7B+ verified trade records. Buy exactly what you need, no
              subscription required.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <Link href="/catalogue" className="btn-gold">
                Browse the Catalogue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/category/bundles" className="btn-ghost-light">
                See bundles
              </Link>
            </div>
          </div>

          {/* Floating data composition */}
          <div className="relative h-[560px] lg:h-[600px] hidden md:block">
            {/* Counter */}
            <div className="glass absolute top-0 right-0 w-[360px] p-7">
              <div
                className="flex items-center gap-[10px] text-[10px] uppercase text-gray-2"
                style={{ letterSpacing: "0.24em" }}
              >
                <span
                  className="w-[6px] h-[6px] rounded-full bg-positive pulse-dot"
                  style={{ boxShadow: "0 0 10px var(--positive)" }}
                />
                Live · ADAMftd index
              </div>
              <div
                className="serif text-white mt-4"
                style={{
                  fontWeight: 500,
                  fontSize: 72,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                7.21
                <sup
                  className="text-gold italic"
                  style={{
                    fontSize: 28,
                    top: "6px",
                    position: "relative",
                    marginLeft: 4,
                  }}
                >
                  B+
                </sup>
              </div>
              <div
                className="text-[13px] text-gray-2 mt-1"
                style={{ letterSpacing: "0.04em" }}
              >
                Verified trade records under analysis
              </div>
              <div className="flex justify-between mono text-[11px] text-gray-2 border-t border-white/10 mt-5 pt-3">
                <span>Last sync 03:42 UTC</span>
                <span className="text-positive">+ 41,208 today</span>
              </div>
            </div>

            {/* Top corridors */}
            <div
              className="glass-tight absolute top-16 right-[280px] w-[220px] px-5 py-4"
              style={{ transform: "rotate(-2deg)" }}
            >
              <div
                className="text-[10px] uppercase text-gold mb-2"
                style={{ letterSpacing: "0.22em" }}
              >
                Top corridors · 24h
              </div>
              {[
                ["DE → BG", "€ 18.4M"],
                ["IT → UK", "€ 14.1M"],
                ["TR → DE", "€ 11.8M"],
                ["BG → RO", "€ 9.3M"],
              ].map(([c, v], i, a) => (
                <div
                  key={c}
                  className={`text-[12px] py-1 flex justify-between ${
                    i === a.length - 1 ? "" : "border-b border-white/10"
                  }`}
                >
                  <span className="text-white">{c}</span>
                  <span className="mono text-gold">{v}</span>
                </div>
              ))}
            </div>

            {/* Report card */}
            <div className="glass absolute top-[170px] left-0 w-[380px] p-6">
              <div className="flex justify-between items-center mb-4">
                <span
                  className="text-[10px] uppercase text-gold"
                  style={{ letterSpacing: "0.22em" }}
                >
                  Market Report
                </span>
                <span className="mono text-[10px] text-gray-2">MR-001</span>
              </div>
              <h3
                className="serif text-white text-2xl leading-tight mb-3"
                style={{ fontWeight: 500 }}
              >
                Single Country
                <br />
                Market Report
              </h3>
              <p className="text-[12px] text-gray-2 leading-relaxed">
                A complete intelligence report for one product (by HS code) in
                one country. Demand, imports, key partners, pricing, the
                competitive landscape.
              </p>
              <div className="flex justify-between items-baseline mt-5 pt-3 border-t border-white/10">
                <span className="serif text-white text-[22px]">$499</span>
                <span
                  className="text-[10px] uppercase text-gray-2"
                  style={{ letterSpacing: "0.18em" }}
                >
                  One-time · PDF
                </span>
              </div>
            </div>

            {/* Hormuz impact gauge */}
            <div className="glass absolute bottom-0 right-10 w-[280px] p-6">
              <div
                className="text-[10px] uppercase text-gray-2"
                style={{ letterSpacing: "0.22em" }}
              >
                Hormuz Impact · 180d
              </div>
              <h4
                className="serif text-white text-lg mt-2 mb-4"
                style={{ fontWeight: 500 }}
              >
                Soybean meal · HS 230400
              </h4>
              <div
                className="relative h-[6px] rounded-full overflow-hidden"
                style={{
                  background:
                    "linear-gradient(90deg, var(--positive), var(--gold) 60%, var(--negative))",
                }}
              >
                <div
                  className="absolute -top-1 w-[2px] h-[14px] bg-white rounded-sm"
                  style={{ left: "58%", transform: "translateX(-50%)" }}
                />
              </div>
              <div className="flex justify-between mt-2 mono text-[10px] text-gray-2">
                <span>LOW</span>
                <span>MODERATE</span>
                <span>SEVERE</span>
              </div>
              <div className="serif text-gold text-[40px] leading-none mt-4">
                58{" "}
                <span className="text-gray-2 text-lg italic">/ Moderate</span>
              </div>
              <div className="text-[11px] text-gray-2 mt-1">
                Supply vulnerability score
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============ TRUST BAR ============ */}
      <section className="container-px">
        <div className="glass-tight px-6 py-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-[13px] text-gray-2">
          {trust.map((t, i) => (
            <span key={t} className="flex items-center gap-4">
              {i > 0 && <span className="h-1 w-1 rounded-full bg-gold" />}
              <span>{t}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ============ FEATURED ============ */}
      <section className="container-px py-20">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-14">
          <div className="num-italic">— 01 / Featured</div>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h2
                className="serif font-medium text-3xl md:text-[48px] text-white"
                style={{ lineHeight: 1.04, letterSpacing: "-0.01em" }}
              >
                Popular intelligence products
              </h2>
              <p className="text-[15px] text-gray-2 leading-relaxed max-w-2xl mt-4">
                The reports our buyers reach for first. Each is grounded in
                7B+ verified records and quality-checked by a sector specialist
                before it ships.
              </p>
            </div>
            <Link
              href="/catalogue"
              className="text-[11px] uppercase text-gold hover:text-cream inline-flex items-center gap-2"
              style={{ letterSpacing: "0.18em" }}
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </div>
      </section>

      {/* ============ START FROM YOUR GOAL ============ */}
      <section className="container-px py-20">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-14">
          <div className="num-italic">— 02 / Start here</div>
          <div>
            <h2
              className="serif font-medium text-3xl md:text-[48px] text-white"
              style={{ lineHeight: 1.04, letterSpacing: "-0.01em" }}
            >
              Start from what you&apos;re trying to do
            </h2>
            <p className="text-[15px] text-gray-2 leading-relaxed max-w-2xl mt-4">
              Tell us your goal and we&apos;ll point you to the right report
              or bundle. No need to read all 40.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((u) => {
            const Icon = u.icon;
            return (
              <Link key={u.title} href={u.href} className="card group p-7">
                <Icon className="h-7 w-7 text-gold" />
                <h3
                  className="serif text-white text-lg mt-5 leading-snug"
                  style={{ fontWeight: 500 }}
                >
                  {u.title}
                </h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-gray-2">
                  {u.body}
                </p>
                <span
                  className="mt-5 inline-flex items-center gap-1.5 text-[11px] uppercase text-gold transition-colors group-hover:text-cream"
                  style={{ letterSpacing: "0.18em" }}
                >
                  {u.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ BROWSE BY CATEGORY ============ */}
      <section className="container-px py-20">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-14">
          <div className="num-italic">— 03 / Catalogue</div>
          <div>
            <h2
              className="serif font-medium text-3xl md:text-[48px] text-white"
              style={{ lineHeight: 1.04, letterSpacing: "-0.01em" }}
            >
              Find the right intelligence
            </h2>
            <p className="text-[15px] text-gray-2 leading-relaxed max-w-2xl mt-4">
              Six product lines plus tenders, custom research, and credits.
              Pick a category to drill in.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {browse.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="card items-center gap-3 p-6 text-center"
              >
                <Icon className="h-7 w-7 text-gold" />
                <span
                  className="text-[13px] text-cream mt-1"
                  style={{ fontWeight: 500 }}
                >
                  {c.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="container-px py-20">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-14">
          <div className="num-italic">— 04 / How it works</div>
          <div>
            <h2
              className="serif font-medium text-3xl md:text-[48px] text-white"
              style={{ lineHeight: 1.04, letterSpacing: "-0.01em" }}
            >
              From question to PDF in three steps
            </h2>
            <p className="text-[15px] text-gray-2 leading-relaxed max-w-2xl mt-4">
              No subscription, no platform login. Buy the artefact, get the
              file, decide.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="glass p-8">
              <p className="num-italic mb-4">{s.n}</p>
              <h3
                className="serif text-white text-xl mb-3"
                style={{ fontWeight: 500 }}
              >
                {s.title}
              </h3>
              <p className="text-[13px] text-gray-2 leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ TRUST ============ */}
      <section className="container-px py-20">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-14">
          <div className="num-italic">— 05 / Trust</div>
          <div>
            <h2
              className="serif font-medium text-3xl md:text-[48px] text-white"
              style={{ lineHeight: 1.04, letterSpacing: "-0.01em" }}
            >
              Intelligence you can stand behind
            </h2>
            <p className="text-[15px] text-gray-2 leading-relaxed max-w-2xl mt-4">
              Three reasons our reports get cited inside ministries, banks,
              and boardrooms.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {trustPoints.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="glass p-8">
                <Icon className="h-7 w-7 text-gold" />
                <h3
                  className="serif text-white text-lg mt-5"
                  style={{ fontWeight: 500 }}
                >
                  {t.title}
                </h3>
                <p className="mt-3 text-[13px] text-gray-2 leading-relaxed">
                  {t.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ SAMPLE PREVIEW CTA ============ */}
      <section className="container-px py-20">
        <div className="glass p-10 md:p-14 grid grid-cols-1 items-center gap-12 lg:grid-cols-2 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 50% 50% at 20% 50%, rgba(201,151,58,0.15), transparent 70%)",
            }}
          />
          <div className="grid grid-cols-3 gap-3 relative z-10">
            {[false, false, true].map((blur, i) => (
              <div key={i} className="relative">
                <div
                  className={`aspect-[1/1.414] rounded-md bg-cream/95 p-3 ${
                    blur ? "blur-[5px]" : ""
                  }`}
                >
                  <div className="h-2 w-1/2 rounded bg-gold/70" />
                  <div className="mt-2 space-y-1.5">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <div
                        key={j}
                        className="h-1.5 rounded bg-navy/15"
                        style={{ width: `${88 - j * 9}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 h-12 rounded bg-navy/5" />
                </div>
                {blur && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="relative z-10">
            <span className="eyebrow">See before you buy</span>
            <h2
              className="serif text-white mt-4"
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              See what you get before you buy
            </h2>
            <p className="mt-5 max-w-md text-[15px] text-gray-2 leading-relaxed">
              Every product shows free preview pages. Read the structure, the
              charts, and the methodology, then unlock the full report,
              licensed to you, with one payment.
            </p>
            <Link
              href="/product/single-country-market-report"
              className="btn-gold mt-8"
            >
              View a sample report <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============ NEWSLETTER ============ */}
      <section className="container-px py-16">
        <div className="glass p-10 md:p-14 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <span className="pill mb-4">Newsletter</span>
            <h2
              className="serif text-white mt-5"
              style={{
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 400,
                lineHeight: 1.1,
              }}
            >
              Stay ahead of global trade shifts
            </h2>
            <p className="mt-3 max-w-lg text-[15px] text-gray-2 leading-relaxed">
              Weekly intelligence: chokepoint alerts, tender wins, policy
              changes. $29/mo. Every report in the catalogue stays a
              one-time purchase.
            </p>
          </div>
          <NewsletterSignup />
        </div>
      </section>

      {/* ============ MARK ============ */}
      <section className="container-px py-20">
        <div className="glass p-12 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 40% 60% at 50% 50%, rgba(201,151,58,0.18), transparent 70%)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center">
            <BridgeMark className="h-20 w-20" />
            <p
              className="serif text-white mt-6"
              style={{
                fontSize: "clamp(36px, 5vw, 56px)",
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              The question is the brief.
              <br />
              <em className="text-gold italic" style={{ fontWeight: 400 }}>
                The brief is the report.
              </em>
            </p>
            <p className="mt-6 max-w-xl text-[15px] text-gray-2 leading-relaxed">
              Tell us the decision you&apos;re trying to make. We&apos;ll
              point you to the right artefact, or scope a custom brief inside
              48 hours.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/catalogue" className="btn-gold">
                Browse the catalogue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/about" className="btn-ghost-light">
                About Ponte
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
       </section>
    </>
  );
}
>
  );
}
