import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const WHY_DESC =
  "Why buyers choose Ponte: curated by senior analysts, licensed for distribution, citable methodology, no subscription required.";

export const metadata: Metadata = {
  title: "Why Ponte",
  description: WHY_DESC,
  alternates: { canonical: "/why-ponte" },
  openGraph: {
    title: "Why Ponte Trade",
    description: WHY_DESC,
    url: "/why-ponte",
    siteName: "Ponte Trade",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why Ponte Trade",
    description: WHY_DESC,
  },
};

const pillars = [
  {
    n: "01",
    eyebrow: "Curation",
    title: "Curated, not generated.",
    body: "Every Ponte report is reviewed and signed off by a senior sector analyst before it reaches you. No auto-generated drops, no AI-only output landing in your inbox. The brief is the report.",
  },
  {
    n: "02",
    eyebrow: "Licence",
    title: "Licensed for distribution.",
    body: "Each PDF ships with a redistribution licence for your organisation. Cite it in client proposals, board packs, regulatory filings or internal briefs. The watermark is the record.",
  },
  {
    n: "03",
    eyebrow: "Methodology",
    title: "Citable methodology.",
    body: "Every report carries a methodology appendix and source citations: UN Comtrade, World Bank, WTO, Eurostat, ITC, EU Taxud and additional government sources. Outliers flagged, conflicts resolved, assumptions disclosed.",
  },
  {
    n: "04",
    eyebrow: "Ownership",
    title: "No subscription, no platform.",
    body: "Buy the artefact. Own it. There's no seat to maintain, no dashboard to learn, no renewal to negotiate. After delivery you don't need to log in again.",
  },
];

export default function WhyPontePage() {
  return (
    <>
      {/* Hero */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="pill">Why Ponte</span>
        <h1
          className="serif text-white mt-6 mb-7 max-w-3xl"
          style={{
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
          }}
        >
          The brief is the report.{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>
            Your licence is the proof.
          </em>
        </h1>
        <p className="text-[17px] text-gray-2 leading-relaxed max-w-2xl">
          Ponte serves the buyer who never logs into a platform: consultants,
          lawyers, chambers, EPAs, M&amp;A teams, board members. You want a
          licensed PDF you can cite, not a subscription you have to defend.
        </p>
      </header>

      {/* Pillars */}
      <section className="container-px py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {pillars.map((p) => (
            <article key={p.n} className="glass p-10">
              <div className="flex items-baseline gap-4">
                <span className="num-italic">— {p.n}</span>
                <span className="eyebrow">{p.eyebrow}</span>
              </div>
              <h2
                className="serif text-white mt-5"
                style={{
                  fontSize: 28,
                  fontWeight: 400,
                  lineHeight: 1.12,
                  letterSpacing: "-0.01em",
                }}
              >
                {p.title}
              </h2>
              <p className="mt-4 text-[15px] text-gray-2 leading-relaxed">
                {p.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Foundations */}
      <section className="container-px py-16 lg:py-20">
        <div className="glass p-10 lg:p-14">
          <span className="eyebrow">Foundations</span>
          <h2
            className="serif text-white mt-4 max-w-3xl"
            style={{
              fontSize: 36,
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
            }}
          >
            Transaction-level trade evidence.{" "}
            <em className="text-gold italic" style={{ fontWeight: 400 }}>
              Cross-checked against the sources you already trust.
            </em>
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] text-gray-2 leading-relaxed">
            Every Ponte report is grounded in transaction-level trade evidence
            and official sources, combining machine-scale data aggregation with
            expert human review by our research team.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="container-px pb-20">
        <div className="glass p-12 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 40% 60% at 50% 50%, rgba(201,151,58,0.18), transparent 70%)",
            }}
          />
          <div className="relative z-10">
            <h2
              className="serif text-white"
              style={{
                fontSize: 32,
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              Ready to commission a brief?
            </h2>
            <p className="mt-5 max-w-xl mx-auto text-[15px] text-gray-2 leading-relaxed">
              Browse the catalogue, or tell us the decision you&apos;re
              trying to make and we&apos;ll scope a custom brief inside 48
              hours.
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
