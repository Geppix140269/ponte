import type { Metadata } from "next";
import Link from "next/link";
import { BridgeMark } from "@/components/Logo";

const ABOUT_DESC =
  "ponte.trade is the verified network for real buyers, sellers, and trading houses: counterparty verification, direct deal rooms, secured settlement, and market intelligence. An ICTTM company.";

export const metadata: Metadata = {
  title: "About",
  description: ABOUT_DESC,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About ponte.trade",
    description: ABOUT_DESC,
    url: "/about",
    siteName: "Ponte Trade",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About ponte.trade",
    description: ABOUT_DESC,
  },
};

const principles = [
  {
    n: "i.",
    title: "Verified, not self-reported",
    body: "Every counterparty is screened against sanctions, company registries, customs activity and beneficial owners, with a trust score and verification tier on each profile. Grounded in ADAMftd data, not claims.",
  },
  {
    n: "ii.",
    title: "Principals, not brokers",
    body: "ponte.trade is for real buyers, sellers and trading houses. Contact details stay private until both sides signal interest, so you deal directly with decision-makers rather than chains of intermediaries.",
  },
  {
    n: "iii.",
    title: "Secured settlement",
    body: "Milestone escrow holds funds and releases them against delivery documents, so payment and goods move together and neither side trades on blind trust.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="pill">About Ponte Trade</span>
        <h1
          className="serif text-ink mt-6 mb-7 max-w-3xl"
          style={{
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 72px)",
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
          }}
        >
          The verified network for{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>
            real buyers and sellers.
          </em>
        </h1>
        <p className="text-[17px] text-gray-2 leading-relaxed max-w-2xl">
          Ponte (Italian for &ldquo;bridge&rdquo;) connects verified buyers
          and sellers so they can trade directly and settle securely, backed by
          ADAMftd trade intelligence. Market intelligence reports are available
          on demand.
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
              className="serif font-medium text-3xl md:text-[40px] text-ink"
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
                className="serif text-ink text-xl"
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
              className="serif text-ink mt-4"
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
              ponte.trade is owned by the International Centre for Trade
              Transparency Limited (ICTTM), the UK group that maintains one
              of the largest verified trade-data infrastructures in the
              world: 7 billion+ records cross-checked against OFAC, EU, UN
              and UK screening and official customs sources.
            </p>
            <Link
              href="/why-ponte"
              className="mt-6 inline-flex items-center gap-1.5 text-[11px] uppercase text-gold hover:text-ink"
              style={{ letterSpacing: "0.18em" }}
            >
              Why ponte.trade →
            </Link>
          </div>

          <div className="glass p-10">
            <span className="eyebrow">Why ponte.trade exists</span>
            <h2
              className="serif text-ink mt-4"
              style={{
                fontSize: 32,
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              Payment is the problem.
            </h2>
            <p className="mt-5 text-[15px] text-gray-2 leading-relaxed">
              In global trade, the hardest part is rarely finding a
              counterparty. It is trusting them enough to move money. ponte.trade
              exists to remove that friction: verify who you are dealing with,
              trade directly with verified principals, and settle through
              milestone escrow.
            </p>
            <Link href="/network/verify" className="btn-gold mt-7">
              Verify a counterparty
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
              className="serif text-ink mt-6"
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
              of every counterparty check.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
