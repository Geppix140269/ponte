import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Case Studies",
  description:
    "Results that speak for themselves — telecoms scaling, media turnarounds, ferry market entry, agricultural supply chains, and fibre optics expansion.",
};

const caseStudies = [
  {
    number: "01",
    sector: "Telecommunications",
    client: "CCC Alpha",
    headline: "Scaling a Telecoms Business from €70M to €120M",
    description:
      "Led the strategic and operational scaling of a telecommunications business, growing annual revenue from €70M to €120M while transforming profitability.",
    result: "€5M EBITDA improvement",
  },
  {
    number: "02",
    sector: "Media",
    client: "Sitges Media Factory SL",
    headline: "30% Revenue Growth in 9 Months",
    description:
      "Restructured the business model and commercial strategy, unlocking rapid, sustainable revenue growth within a single financial year.",
    result: "+30% revenue in 9 months",
  },
  {
    number: "03",
    sector: "Maritime",
    client: "Bluemar Ferries SL",
    headline: "Mediterranean Ferry Market Entry",
    description:
      "Designed and executed a market entry strategy for ferry operations across competitive Mediterranean routes as Chief Operating Officer.",
    result: "New routes established",
  },
  {
    number: "04",
    sector: "Agriculture",
    client: "Ponte Operations",
    headline: "EU Market Entry for Ukrainian Agricultural Products",
    description:
      "Built Eastern European supply chain partnerships and navigated EU market access to bring Ukrainian agricultural commodities to new buyers.",
    result: "Supply chain established",
  },
  {
    number: "05",
    sector: "Telecommunications",
    client: "Dynegy Europe Communication",
    headline: "Fibre Optics Expansion Across Italy & Germany",
    description:
      "Drove fibre optics infrastructure expansion across two major European markets through strategic partnerships and operational execution.",
    result: "Key infrastructure partnerships",
  },
];

export default function CaseStudiesPage() {
  return (
    <>
      <PageHero
        label="Case Studies"
        title="Results that speak for themselves"
        subtitle="Real outcomes across telecommunications, media, maritime, and agriculture — delivered through strategy and execution."
      />

      <section className="section bg-white">
        <div className="container-px space-y-px bg-line">
          {caseStudies.map((study) => (
            <article
              key={study.number}
              className="grid grid-cols-1 gap-8 bg-white py-12 lg:grid-cols-12"
            >
              <div className="lg:col-span-1">
                <span className="font-serif text-4xl text-gold">
                  {study.number}
                </span>
              </div>

              <div className="lg:col-span-7">
                <p className="section-label">{study.sector}</p>
                <h2 className="mt-3 text-2xl sm:text-3xl">{study.headline}</h2>
                <p className="mt-2 text-sm font-medium text-navy">
                  {study.client}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray">
                  {study.description}
                </p>
              </div>

              <div className="lg:col-span-4">
                <div className="bg-cream p-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray">
                    Result
                  </p>
                  <p className="mt-2 font-serif text-2xl text-navy">
                    {study.result}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-cream">
        <div className="container-px py-20 text-center sm:py-24">
          <h2 className="mx-auto max-w-2xl text-3xl sm:text-4xl">
            Ready to be the next success story?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-gray">
            Let&apos;s discuss how Ponte can deliver results for your business.
          </p>
          <div className="mt-10">
            <Link href="/contact" className="btn-navy">
              Start a Conversation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
