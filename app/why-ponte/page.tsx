import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const WHY_DESC =
  "Why trade on ponte.trade: every counterparty verified against sanctions, registry, customs activity and beneficial owners, direct access to real principals, and secured settlement. Backed by ADAMftd.";

export const metadata: Metadata = {
  title: "Why ponte.trade",
  description: WHY_DESC,
  alternates: { canonical: "/why-ponte" },
  openGraph: {
    title: "Why ponte.trade",
    description: WHY_DESC,
    url: "/why-ponte",
    siteName: "ponte.trade",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why ponte.trade",
    description: WHY_DESC,
  },
};

const pillars = [
  {
    n: "01",
    eyebrow: "Verification",
    title: "Verify before you trade.",
    body: "Every counterparty is screened against sanctions and watchlists, company registries, real customs activity, and beneficial owners. A 0-100 trust score and a verification tier sit on every profile, grounded in ADAMftd data, not self-reported claims.",
  },
  {
    n: "02",
    eyebrow: "Real principals",
    title: "Buyers and sellers, not brokers.",
    body: "ponte.trade connects you directly to verified trading houses, producers and end-buyers. Contact details stay private until both sides signal interest, so you reach decision-makers instead of chains of intermediaries.",
  },
  {
    n: "03",
    eyebrow: "Settlement",
    title: "Secured by ponte.",
    body: "Move money and goods together. Milestone escrow holds funds and releases them against delivery documents, so neither side has to trade on blind trust. Payment risk stops being the reason a good deal dies.",
  },
  {
    n: "04",
    eyebrow: "Backed by ICTTM",
    title: "7 billion+ verified trade records.",
    body: "ponte.trade is built on ADAMftd, the verified trade-data infrastructure maintained by ICTTM. The same data that powers our verification also feeds the market intelligence reports you can license on demand.",
  },
];

export default function WhyPontePage() {
  return (
    <>
      {/* Hero */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="pill">Why ponte.trade</span>
        <h1
          className="serif text-ink mt-6 mb-7 max-w-3xl"
          style={{
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
          }}
        >
          Trade with counterparties{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>
            you can actually trust.
          </em>
        </h1>
        <p className="text-[17px] text-gray-2 leading-relaxed max-w-2xl">
          ponte.trade is the verified network for real buyers, sellers, and
          trading houses. Verify any company, publish offers and requests, and
          settle securely, all grounded in ADAMftd trade intelligence.
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
                className="serif text-ink mt-5"
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

      {/* Backed by ICTTM */}
      <section className="container-px py-16 lg:py-20">
        <div className="glass p-10 lg:p-14">
          <span className="eyebrow">Backed by ICTTM</span>
          <h2
            className="serif text-ink mt-4 max-w-3xl"
            style={{
              fontSize: 36,
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
            }}
          >
            Grounded intelligence,{" "}
            <em className="text-gold italic" style={{ fontWeight: 400 }}>
              cross-checked against the sources you already trust.
            </em>
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] text-gray-2 leading-relaxed">
            ponte.trade is owned by the International Centre for Trade
            Transparency Limited (ICTTM), the UK group that maintains one of the
            largest verified trade-data infrastructures in the world. Every
            verification and every report draws on the same ADAMftd data,
            cross-checked against OFAC, EU, UN and UK screening and official
            customs sources.
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
              className="serif text-ink"
              style={{
                fontSize: 32,
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              Verify your first counterparty.
            </h2>
            <p className="mt-5 max-w-xl mx-auto text-[15px] text-gray-2 leading-relaxed">
              Run a free verification, browse live offers and requests, or open a
              secured deal room with a verified principal.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/network/verify" className="btn-gold">
                Verify a counterparty <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/network/listings" className="btn-ghost-light">
                Browse listings
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
