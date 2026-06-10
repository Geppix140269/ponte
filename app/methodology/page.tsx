import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const METHODOLOGY_DESC =
  "Machine-scale data aggregation across UN Comtrade, World Bank, WTO, Eurostat, ITC and EU Taxud, combined with expert human review. Every report signed off by a senior sector analyst.";

export const metadata: Metadata = {
  title: "Methodology",
  description: METHODOLOGY_DESC,
  alternates: { canonical: "/methodology" },
  openGraph: {
    title: "Methodology | Ponte Trade",
    description: METHODOLOGY_DESC,
    url: "/methodology",
    siteName: "Ponte Trade",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Methodology | Ponte Trade",
    description: METHODOLOGY_DESC,
  },
};

const sources = [
  "UN Comtrade",
  "World Bank",
  "WTO",
  "Eurostat",
  "ITC",
  "EU Taxud",
];

export default function MethodologyPage() {
  return (
    <>
      {/* Hero */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="pill">Methodology</span>
        <h1
          className="serif text-white mt-6 mb-7 max-w-3xl"
          style={{
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
          }}
        >
          Machine-scale data.{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>
            Senior-analyst sign-off.
          </em>
        </h1>
        <p className="text-[17px] text-gray-2 leading-relaxed max-w-2xl">
          Our methodology combines machine-scale data aggregation across UN
          Comtrade, World Bank, WTO, Eurostat, ITC, EU Taxud and additional
          government sources with expert human review by our research team.
          Where official sources conflict, outliers are flagged and Monte
          Carlo models estimate the most likely outcome. Every report is
          reviewed and signed off by a senior sector specialist before it
          reaches the customer.
        </p>
      </header>

      {/* Sources block */}
      <section className="container-px py-10 lg:py-14">
        <div className="glass p-10 lg:p-14">
          <span className="eyebrow">Authoritative sources</span>
          <h2
            className="serif text-white mt-4 max-w-3xl"
            style={{
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            Cross-checked against the sources you already trust.
          </h2>
          <div className="mt-7 flex flex-wrap gap-2">
            {sources.map((s) => (
              <span
                key={s}
                className="rounded-full px-3 py-1.5 text-[11px] uppercase text-gold"
                style={{
                  background: "rgba(201,151,58,0.10)",
                  border: "1px solid rgba(201,151,58,0.25)",
                  letterSpacing: "0.18em",
                }}
              >
                {s}
              </span>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-[14px] text-gray-2 leading-relaxed">
            Plus national customs authorities, sector-specific retail and
            consumer data, EU Taxud weekly surveillance for seafood, US
            Census Bureau Foreign Trade statistics, and primary research
            where the question requires it.
          </p>
        </div>
      </section>

      {/* Process */}
      <section className="container-px py-12 lg:py-16">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-10">
          <div className="num-italic">— 01 / Process</div>
          <div>
            <h2
              className="serif font-medium text-3xl md:text-[40px] text-white"
              style={{ lineHeight: 1.04, letterSpacing: "-0.01em" }}
            >
              From query to licensed PDF.
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="glass p-10">
            <span className="eyebrow">Aggregation</span>
            <h3
              className="serif text-white mt-5"
              style={{ fontSize: 24, fontWeight: 400, lineHeight: 1.1 }}
            >
              Machine-scale data ingestion.
            </h3>
            <p className="mt-4 text-[14px] text-gray-2 leading-relaxed">
              Our infrastructure ingests, normalises and cross-references 7
              billion+ verified trade records against the official sources
              listed above. HS codes are reconciled across national
              variants. Currencies and units are harmonised. Outliers are
              flagged.
            </p>
          </div>
          <div className="glass p-10">
            <span className="eyebrow">Conflict resolution</span>
            <h3
              className="serif text-white mt-5"
              style={{ fontSize: 24, fontWeight: 400, lineHeight: 1.1 }}
            >
              Sources conflict — we resolve them.
            </h3>
            <p className="mt-4 text-[14px] text-gray-2 leading-relaxed">
              Where authoritative sources disagree, we flag the conflict in
              the report. Monte Carlo models estimate the most likely
              outcome with confidence intervals. Assumptions are disclosed
              in the methodology appendix.
            </p>
          </div>
          <div className="glass p-10">
            <span className="eyebrow">Senior-analyst review</span>
            <h3
              className="serif text-white mt-5"
              style={{ fontSize: 24, fontWeight: 400, lineHeight: 1.1 }}
            >
              Every report signed off.
            </h3>
            <p className="mt-4 text-[14px] text-gray-2 leading-relaxed">
              No report leaves Ponte without a senior sector specialist
              reviewing it. They check the data, challenge the conclusions,
              and write or refine the executive summary. The reviewer's
              initials appear on the cover page.
            </p>
          </div>
          <div className="glass p-10">
            <span className="eyebrow">Licence and provenance</span>
            <h3
              className="serif text-white mt-5"
              style={{ fontSize: 24, fontWeight: 400, lineHeight: 1.1 }}
            >
              Citable. Traceable. Yours.
            </h3>
            <p className="mt-4 text-[14px] text-gray-2 leading-relaxed">
              Every PDF ships with a single-organisation redistribution
              licence, a watermark ID written to our ledger, full source
              citations, and a methodology appendix. Cite it in proposals,
              board packs, or regulatory filings.
            </p>
          </div>
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
              Ready to commission a report?
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/catalogue" className="btn-gold">
                Browse the catalogue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/why-ponte" className="btn-ghost-light">
                Why Ponte
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
