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
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import NewsletterSignup from "@/components/NewsletterSignup";
import { featuredProducts } from "@/lib/catalogue";

const trust = [
  "7B+ verified trade records",
  "199 country profiles",
  "48h report delivery",
  "Grounded AI, not guesswork",
  "An ICTTM company",
];

const browse = [
  { slug: "market-reports", name: "Market Reports", icon: FileText },
  { slug: "analysis", name: "Market Analysis", icon: BarChart3 },
  { slug: "bundles", name: "Intelligence Bundles", icon: Layers },
  { slug: "geopolitical", name: "Geopolitical Risk", icon: Globe2 },
  { slug: "company-supplier", name: "Company Intel", icon: Building2 },
  { slug: "custom-research", name: "Custom Research", icon: Sparkles },
];

const steps = [
  { n: "01", title: "Choose your report", body: "Browse the catalogue and pick the intelligence you need." },
  { n: "02", title: "Configure it", body: "Add your HS code, country, or product. We tailor the report to your question." },
  { n: "03", title: "Pay once. Receive your PDF.", body: "Instant download or SLA-backed delivery to your inbox. No subscription." },
];

export default function HomePage() {
  const featured = featuredProducts();

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
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
            Research-grade market reports and analysis powered by ADAMftd. No
            subscription required. Buy exactly what you need.
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
              charts, and the methodology — then unlock the full watermarked
              report with one payment.
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
            <p className="mt-2 text-white/60">
              Weekly intelligence: chokepoint alerts, tender wins, policy changes. $29/mo.
            </p>
          </div>
          <NewsletterSignup />
        </div>
      </section>
    </>
  );
}
