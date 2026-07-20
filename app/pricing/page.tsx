import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Brokerage on success fee only. Deal Sheet membership free for vetted members. Analyst calls from $500, Full Market Report $1,800. No subscriptions.",
  alternates: { canonical: "/pricing" },
};

const ANALYST_TIERS = [
  { name: "Analyst Call", price: "$500", meta: "60 min · written recap", note: "One decision, a senior analyst, a one-page follow-up." },
  { name: "Strategy Intensive", price: "$2,000", meta: "Half-day · brief included", note: "A decision with moving parts, with a written brief.", featured: true },
  { name: "Trade Desk Retainer", price: "from $2,500", meta: "Per month · senior-led", note: "A standing analyst, priority turnaround, quarterly review." },
];

export default function PricingPage() {
  return (
    <>
      <section className="container-px pt-16 pb-10">
        <span className="pill">Pricing</span>
        <h1 className="serif text-white mt-6 mb-4 max-w-2xl" style={{ fontWeight: 400, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}>
          Priced by the engagement.
        </h1>
        <p className="text-[17px] text-gray-2 max-w-xl">
          Brokerage on success fee. Membership free. Intelligence by the
          engagement. No subscriptions, ever. All prices in USD.
        </p>
      </section>

      {/* Route 0: The Brokerage */}
      <section className="container-px pb-12">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="eyebrow text-gold">The Brokerage</p>
            <h2 className="serif text-white mt-2" style={{ fontSize: 26, fontWeight: 500 }}>Deals and the network</h2>
          </div>
          <Link href="/brokerage" className="btn-ghost-light">Visit the Deal Desk <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="glass p-7 flex flex-col ring-1 ring-gold/40">
            <h3 className="serif text-white text-xl" style={{ fontWeight: 500 }}>The Deal Desk</h3>
            <div className="mt-2 serif text-gold" style={{ fontSize: 30, fontWeight: 500 }}>Success fee only</div>
            <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Agreed in writing · paid on closing</p>
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-gray-2">
              Bring an offer or a requirement. No retainer, no listing fee.
              The commission is agreed up front in the fee agreement and is
              due only when your deal closes.
            </p>
            <Link href="/brokerage#submit" className="btn-gold mt-6">Submit a deal <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="glass p-7 flex flex-col">
            <h3 className="serif text-white text-xl" style={{ fontWeight: 500 }}>The Deal Sheet</h3>
            <div className="mt-2 serif text-gold" style={{ fontSize: 30, fontWeight: 500 }}>Free</div>
            <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Vetted members · weekly email</p>
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-gray-2">
              One email a week with live, anonymized offers and requirements.
              Free for approved members. Introductions run under signed NCNDA
              and fee terms.
            </p>
            <Link href="/network" className="btn-ghost-light mt-6">Request access <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Route 1: The Analyst Desk */}
      <section className="container-px pb-12">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="eyebrow text-gold">The Analyst Desk</p>
            <h2 className="serif text-white mt-2" style={{ fontSize: 26, fontWeight: 500 }}>Senior analyst access</h2>
          </div>
          <Link href="/advisory" className="btn-ghost-light">Explore the Analyst Desk <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {ANALYST_TIERS.map((t) => (
            <div key={t.name} className={`glass p-7 flex flex-col ${t.featured ? "ring-1 ring-gold/40" : ""}`}>
              <h3 className="serif text-white text-xl" style={{ fontWeight: 500 }}>{t.name}</h3>
              <div className="mt-2 serif text-gold" style={{ fontSize: 30, fontWeight: 500 }}>{t.price}</div>
              <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>{t.meta}</p>
              <p className="mt-4 flex-1 text-[13px] leading-relaxed text-gray-2">{t.note}</p>
              <Link href="/advisory" className="btn-gold mt-6">Book <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ))}
        </div>
      </section>

      {/* Route 2: The Full Market Report */}
      <section className="container-px pb-12 border-t border-white/8 pt-12">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="eyebrow text-gold">The Report</p>
            <h2 className="serif text-white mt-2" style={{ fontSize: 26, fontWeight: 500 }}>Full Market Report</h2>
          </div>
        </div>
        <div className="glass p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-8">
          <div className="md:flex-1">
            <p className="text-[15px] leading-relaxed text-gray-2 max-w-xl">
              A complete market report for one HS code or product, delivered
              either Global or for a single destination country. Demand,
              regulatory and tariff context, the competitive landscape, and
              active counterparties, with senior-analyst sign-off before it
              ships.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["64-page PDF", "Counterparty data", "Source citations", "Global or single country"].map((x) => (
                <span key={x} className="badge">{x}</span>
              ))}
            </div>
          </div>
          <div className="md:text-right">
            <div className="serif text-gold" style={{ fontSize: 44, fontWeight: 500 }}>$1,800</div>
            <Link href="/product/full-market-report" className="btn-gold mt-4">Commission a report <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Enterprise / retainers */}
      <section className="container-px pb-24 border-t border-white/8 pt-12">
        <div className="glass p-8 md:p-10">
          <p className="eyebrow text-gold">For teams and trade bodies</p>
          <h2 className="serif text-white mt-2 mb-3" style={{ fontSize: 26, fontWeight: 500 }}>Retainers, white-label and recurring briefings</h2>
          <p className="text-[15px] leading-relaxed text-gray-2 max-w-2xl">
            Standing advisory engagements, white-label reports under your own
            brand, recurring market briefings for members or boards, and
            multi-report programmes. Scoped to the mandate, billed as a retainer
            or per engagement.
          </p>
          <Link href="/contact?engagement=enterprise" className="btn-ghost-light mt-6">Talk to us <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </>
  );
}
