import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Ponte Trade sells research-grade trade intelligence as one-time products — market reports, analysis, and risk briefs, verified against official sources.",
};

const principles = [
  {
    title: "Output, not subscriptions",
    body: "We sell the finished intelligence — PDFs, data packs, and briefs — that you buy once. No seats, no platform to learn.",
  },
  {
    title: "Grounded, not guessed",
    body: "Every report is verified against multiple official sources. Where sources conflict, we identify outliers first and model the most likely outcome.",
  },
  {
    title: "Fast, SLA-backed delivery",
    body: "Instant downloads where possible; 24h and 48h SLAs on manual reports, with QA before anything reaches you.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-navy">
        <div className="container-px py-20 lg:py-24">
          <p className="eyebrow">About Ponte Trade</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold text-white sm:text-5xl">
            Trade intelligence, sold as a product
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/70">
            Ponte (Italian for &ldquo;bridge&rdquo;) connects buyers and sellers
            to the market intelligence they need to trade with confidence —
            delivered as reports you own, not software you rent.
          </p>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="container-px grid grid-cols-1 gap-8 md:grid-cols-3">
          {principles.map((p) => (
            <div key={p.title} className="border-t-2 border-gold pt-5">
              <h2 className="text-lg font-bold">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-navy/65">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-mist py-16">
        <div className="container-px max-w-3xl">
          <p className="eyebrow">Methodology</p>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
            How our reports are built
          </h2>
          <p className="mt-4 text-navy/70">
            We draw on billions of verified trade records and official datasets —
            UN Comtrade, the World Bank, WTO, Eurostat, ITC, and EU Taxud among
            them. Data is cross-checked across sources; outliers are flagged and
            probabilistic models estimate the most likely figure where official
            numbers disagree. Every manual report passes QA before delivery and
            ships as a watermarked PDF licensed to the buyer.
          </p>
          <div className="mt-8">
            <Link href="/catalogue" className="btn-navy">Browse the Catalogue</Link>
          </div>
        </div>
      </section>
    </>
  );
}
