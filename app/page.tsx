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
import { featuredProducts } from "@/lib/catalogue-db";

export const revalidate = 60;

const trust = [
  "7B+ verified trade records",
  "199 country profiles",
  "48h report delivery",
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
    body: "Check readiness — SWOT, entry barriers, packaging and standards.",
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

// Factual authority signals. NOTE FOR MARKETING: once real customer quotes
// are available, add a testimonials section here (name, role, company).
const trustPoints = [
  {
    icon: FileSearch,
    title: "Verified against official sources",
    body: "Every report is cross-checked against UN Comtrade, the World Bank, WTO, Eurostat, ITC and EU Taxud.",
  },
  {
    icon: ShieldCheck,
    title: "Grounded AI, with human QA",
    body: "Built on the ADAMftd engine and 7B+ verified trade records, then manually quality-checked before delivery.",
  },
  {
    icon: BadgeCheck,
    title: "Backed by ICTTM",
    body: "Ponte Trade is owned by the International Centre for Trade Transparency — the UK group behind ADAMftd.",
  },
];

const steps = [
  { n: "01", title: "Choose your report", body: "Browse the catalogue and pick the intelligence you need." },
  { n: "02", title: "Configure it", body: "Add your HS code, country, or product. We tailor the report to your question." },
  { n: "03", title: "Pay once. Receive your PDF.", body: "Instant download or SLA-backed delivery to your inbox. No subscription." },
];

export default async function HomePage() {
  const featured = await featuredProducts();

  return (
    <>
      {/* Hero */}
      <section className="bg-navy">
        <div className="container-px py-24 sm:py-28 lg:py-32">
          <p className="eyebrow">International trade intelligence</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Trade intelligence.{" "}
            <span className="text-gold">Delivered.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            For exporters, importers and trade bodies: research-grade market
            reports and risk analysis, built on ADAMftd&apos;s grounded-AI
            engine and 7B+ verified trade records. Buy exactly what you need —
            no subscription required.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/catalogue" className="btn-gold">
              Browse the Catalogue <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/category/bundles" className="btn-ghost-light">
              See bundles
            </Link>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-line bg-mist">
        <div className="container-px flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-5 text-center text-sm font-medium text-navy/70">
          {trust.map((t, i) => (
            <span key={t} className="flex items-center gap-4">
              {i > 0 && <span className="h-1 w-1 rounded-full bg-gold" />}
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="section bg-white py-20">
        <div className="container-px">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Featured</p>
              <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
                Popular intelligence products
              </h2>
            </div>
            <Link href="/catalogue" className="hidden text-sm font-semibold text-gold-600 hover:text-navy sm:inline-flex sm:items-center sm:gap-1.5">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Start from your goal — guided recommender */}
      <section className="bg-white pb-20">
        <div className="container-px">
          <p className="eyebrow">Not sure where to start?</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Start from what you&apos;re trying to do
          </h2>
          <p className="mt-3 max-w-xl text-navy/60">
            Tell us your goal and we&apos;ll point you to the right report or
            bundle — no need to read all 40.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((u) => {
              const Icon = u.icon;
              return (
                <Link
                  key={u.title}
                  href={u.href}
                  className="card group p-6"
                >
                  <Icon className="h-7 w-7 text-gold-600" />
                  <h3 className="mt-4 text-base font-bold leading-snug text-navy">
                    {u.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-navy/60">
                    {u.body}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-600 transition-colors group-hover:text-navy">
                    {u.cta}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Browse by category */}
      <section className="bg-mist py-20">
        <div className="container-px">
          <p className="eyebrow">Browse by category</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Find the right intelligence
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {browse.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="card items-center gap-3 p-6 text-center"
                >
                  <Icon className="h-7 w-7 text-gold-600" />
                  <span className="text-sm font-semibold text-navy">{c.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="container-px">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            From question to PDF in three steps
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="border-t-2 border-gold pt-5">
                <span className="text-2xl font-extrabold text-gold">{s.n}</span>
                <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/60">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why buyers trust Ponte */}
      <section className="bg-mist py-20">
        <div className="container-px">
          <p className="eyebrow">Why buyers trust Ponte Trade</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Intelligence you can stand behind
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {trustPoints.map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.title}
                  className="rounded-xl border border-line bg-white p-6"
                >
                  <Icon className="h-7 w-7 text-gold-600" />
                  <h3 className="mt-4 text-base font-bold text-navy">
                    {t.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy/60">
                    {t.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sample preview CTA */}
      <section className="bg-navy py-20">
        <div className="container-px grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="grid grid-cols-3 gap-3">
            {[false, false, true].map((blur, i) => (
              <div key={i} className="relative">
                <div className={`aspect-[1/1.414] rounded-md bg-white/95 p-3 ${blur ? "blur-[5px]" : ""}`}>
                  <div className="h-2 w-1/2 rounded bg-gold/70" />
                  <div className="mt-2 space-y-1.5">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <div key={j} className="h-1.5 rounded bg-navy/15" style={{ width: `${88 - j * 9}%` }} />
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
          <div>
            <p className="eyebrow">See before you buy</p>
            <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
              See what you get before you buy
            </h2>
            <p className="mt-4 max-w-md text-white/70">
              Every product shows free preview pages. Read the structure, the
              charts, and the methodology — then unlock the full report,
              licensed to you, with one payment.
            </p>
            <Link href="/product/single-country-market-report" className="btn-gold mt-7">
              View a sample report <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-navy-900 py-16">
        <div className="container-px flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              Stay ahead of global trade shifts
            </h2>
            <p className="mt-2 max-w-lg text-white/60">
              Weekly intelligence: chokepoint alerts, tender wins, policy
              changes. An optional $29/mo subscription — every report in the
              catalogue stays a one-time purchase.
            </p>
          </div>
          <NewsletterSignup />
        </div>
      </section>
    </>
  );
}
