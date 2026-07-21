import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Store, Briefcase, CalendarClock } from "lucide-react";

export const metadata: Metadata = {
  title: "Fees",
  description:
    "The Ponte marketplace is free: post, get vetted, connect. The desk is optional, on a success fee or a monthly retainer.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <section className="container-px pt-16 pb-10">
        <span className="pill">Fees</span>
        <h1 className="serif text-white mt-6 mb-4 max-w-2xl" style={{ fontWeight: 400, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}>
          The marketplace is{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>free</em>.
        </h1>
        <p className="text-[17px] text-gray-2 max-w-xl">
          Post, get vetted, connect: no listing fees, no subscriptions, no
          commission on deals you close yourselves. You pay only if you ask
          the desk to work for you.
        </p>
      </section>

      <section className="container-px pb-12">
        <div className="grid gap-5 md:grid-cols-3">
          {/* Free marketplace */}
          <div className="glass p-7 flex flex-col ring-1 ring-gold/40">
            <Store className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>The Marketplace</h3>
            <div className="mt-2 serif text-gold" style={{ fontSize: 30, fontWeight: 500 }}>Free</div>
            <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Always · for everyone</p>
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-gray-2">
              Post what you sell or what you need. AI and the desk vet every
              listing before it goes live. You stay anonymous until both
              sides agree to connect, then you deal directly. Producers,
              trading companies and brokers all welcome, roles declared up
              front.
            </p>
            <Link href="/marketplace/new" className="btn-gold mt-6">Start a listing <ArrowRight className="h-4 w-4" /></Link>
          </div>

          {/* Success fee */}
          <div className="glass p-7 flex flex-col">
            <Briefcase className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>The Desk, per deal</h3>
            <div className="mt-2 serif text-gold" style={{ fontSize: 30, fontWeight: 500 }}>Success fee</div>
            <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>% agreed in writing · paid on closing</p>
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-gray-2">
              Want a deal managed end to end? The desk runs verification in
              depth, NCNDA, negotiation, contracts and closing coordination.
              The percentage is agreed up front in the fee agreement and is
              due only when the deal closes. Either side can engage us.
            </p>
            <Link href="/contact?engagement=desk" className="btn-ghost-light mt-6">Bring us a deal <ArrowRight className="h-4 w-4" /></Link>
          </div>

          {/* Retainer */}
          <div className="glass p-7 flex flex-col">
            <CalendarClock className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>The Desk, on your side</h3>
            <div className="mt-2 serif text-gold" style={{ fontSize: 30, fontWeight: 500 }}>Retainer</div>
            <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>Monthly · scoped to the mandate</p>
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-gray-2">
              Continuous sourcing or selling support: a standing mandate to
              find, vet and negotiate on your behalf, month after month.
              For trading teams, producers entering new markets, and buyers
              with recurring programmes.
            </p>
            <Link href="/contact?engagement=retainer" className="btn-ghost-light mt-6">Scope a mandate <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
        <p className="mt-6 text-[12px] text-gray-2 max-w-2xl">
          Fee levels are agreed privately, in writing, before any work
          starts. No hidden costs, no charge for introductions you make
          yourselves on the board.
        </p>
      </section>
    </>
  );
}
