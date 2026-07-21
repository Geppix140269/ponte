import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Fees",
  description:
    "Brokerage on success fee only. No listing fees, no subscriptions.",
  alternates: { canonical: "/pricing" },
};


export default function PricingPage() {
  return (
    <>
      <section className="container-px pt-16 pb-10">
        <span className="pill">Fees</span>
        <h1 className="serif text-white mt-6 mb-4 max-w-2xl" style={{ fontWeight: 400, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}>
          Fees, not subscriptions.
        </h1>
        <p className="text-[17px] text-gray-2 max-w-xl">
          Brokerage on success fee. No subscriptions, ever. All prices in USD.
        </p>
      </section>

      {/* Route 0: The Brokerage */}
      <section className="container-px pb-12">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="eyebrow text-gold">The Brokerage</p>
            <h2 className="serif text-white mt-2" style={{ fontSize: 26, fontWeight: 500 }}>Deals and the network</h2>
          </div>
          <Link href="/marketplace" className="btn-ghost-light">Visit the marketplace <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-5 max-w-2xl">
          <div className="glass p-7 flex flex-col ring-1 ring-gold/40">
            <h3 className="serif text-white text-xl" style={{ fontWeight: 500 }}>The Deal Desk</h3>
            <div className="mt-2 serif text-gold" style={{ fontSize: 30, fontWeight: 500 }}>Success fee only</div>
            <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Agreed in writing · paid on closing</p>
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-gray-2">
              Bring an offer or a requirement. No retainer, no listing fee.
              The commission is agreed up front in the fee agreement and is
              due only when your deal closes.
            </p>
            <Link href="/marketplace" className="btn-gold mt-6">Submit a deal <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Enterprise / retainers */}
      <section className="container-px pb-24 border-t border-white/8 pt-12">
        <div className="glass p-8 md:p-10">
          <p className="eyebrow text-gold">For teams and trade bodies</p>
          <h2 className="serif text-white mt-2 mb-3" style={{ fontSize: 26, fontWeight: 500 }}>Retainers and recurring briefings</h2>
          <p className="text-[15px] leading-relaxed text-gray-2 max-w-2xl">
            Standing advisory engagements, recurring market briefings for
            members or boards, and desk arrangements for trade bodies and
            trading teams. Scoped to the mandate, billed as a retainer or per
            engagement.
          </p>
          <Link href="/contact?engagement=enterprise" className="btn-ghost-light mt-6">Talk to us <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </>
  );
}
