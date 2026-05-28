import type { Metadata } from "next";
import Link from "next/link";
import { BridgeMark } from "@/components/Logo";

const ABOUT_DESC =
  "Ponte Trade sells research-grade trade intelligence as one-time products: reports, analysis, and risk briefs. An ICTTM company.";

export const metadata: Metadata = {
  title: "About",
  description: ABOUT_DESC,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Ponte Trade",
    description: ABOUT_DESC,
    url: "/about",
    siteName: "Ponte Trade",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Ponte Trade",
    description: ABOUT_DESC,
  },
};

const principles = [
  {
    n: "i.",
    title: "Output, not subscriptions",
    body: "We sell the finished intelligence: PDFs, data packs, briefs. Buy once. No seats, no platform to learn.",
  },
  {
    n: "ii.",
    title: "Curated, not generated",
    body: "Every report is reviewed and signed off by a senior sector analyst, then cross-checked against UN Comtrade, the World Bank, WTO, Eurostat, ITC and EU Taxud. Where sources conflict, outliers are flagged and Monte Carlo models estimate the most likely outcome.",
  },
  {
    n: "iii.",
    title: "Delivery date confirmed at checkout",
    body: "We confirm your exact delivery date within 24 hours of order. Your card is held but not charged until we start production on your confirmed slot.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="pill">About Ponte Trade</span>
        <h1
          className="serif text-white mt-6 mb-7 max-w-3xl"
          style={{
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
          }}
        >
          Trade intelligence,{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>
            sold as a product.
          </em>
        </h1>
        <p className="text-[17px] text-gray-2 leading-relaxed max-w-2xl">
          Ponte (Italian for &ldquo;bridge&rdquo;) connects buyers and sellers
          to the market intelligence they need to trade with confidence.
          Delivered as reports you own, not software you rent.
        </p>
        <p
          className="mt-5 text-[11px] uppercase text-gold"
          style={{ letterSpacing: "0.22em" }}
        >
          An ICTTM company
        </p>
      </header>

      {/* Principles */}
      <section className="container-px py-16 lg:py-20">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-14 items-baseline mb-14">
          <div className="num-italic">— 01 / Principles</div>
          <div>
            <h2
              className="serif font-medium text-3xl md:text-[40px] text-white"
              style={{ lineHeight: 1.04, letterSpacing: "-0.01em" }}
            >
              Three rules we don&apos;t break.
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {principles.map((p) => (
            <div key={p.title} className="glass p-8">
              <p className="num-italic mb-4">{p.n}</p>
              <h3
                className="serif text-white text-xl"
                style={{ fontWeight: 500 }}
              >
                {p.title}
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed text-gray-2">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Ownership & Why */}
      <section className="container-px py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="glass p-10">
            <span className="eyebrow">Ownership</span>
            <h2
              className="serif text-white mt-4"
              style={{
                fontSize: 32,
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              Backed by{" "}
              <em className="text-gold italic" style={{ fontWeight: 400 }}>
                ICTTM.
              </em>
            </h2>
            <p className="mt-5 text-[15px] text-gray-2 leading-relaxed">
              Ponte Trade is owned by the International Centre for Trade
              Transparency Limited (ICTTM), the UK group that maintains one
              of the largest verified trade-data infrastructures in the
              world: 7 billion+ records cross-checked against UN Comtrade,
              the World Bank, WTO, Eurostat, ITC and EU Taxud.
            </p>
            <Link
              href="/why-ponte"
              className="mt-6 inline-flex items-center gap-1.5 text-[11px] uppercase text-gold hover:text-cream"
              style={{ letterSpacing: "0.18em" }}
            >
              Why Ponte →
            </Link>
          </div>

          <div className="glass p-10">
            <span className="eyebrow">Why Ponte Trade exists</span>
            <h2
              className="serif text-white mt-4"
              style={{
                fontSize: 32,
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              A different buyer.
            </h2>
            <p className="mt-5 text-[15px] text-gray-2 leading-relaxed">
              Ponte serves a distinct buyer: the consultant, lawyer,
              chamber, EPA, board member or M&amp;A team who needs one
              specific intelligence artefact, right now, without a
              subscription, a seat, or a platform to learn. Buy the
              report. Cite it. Move on.
            </p>
            <Link href="/catalogue" className="btn-gold mt-7">
              Browse the Catalogue
            </Link>
          </div>
        </div>
      </section>

      {/* The mark */}
      <section className="container-px py-16">
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
                fontSize: 28,
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              An arch ·{" "}
              <em className="text-gold italic" style={{ fontWeight: 400 }}>
                a signal
              </em>{" "}
              · a bridge.
            </p>
            <p className="mt-4 max-w-xl text-[14px] text-gray-2 leading-relaxed">
              The mark is a single Roman arch with a gold apex node. The arch
              is the bridge: connection, structure, classical confidence. The
              node is the data point: the verified trade record at the centre
              of every report.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
