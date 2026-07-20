import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Handshake,
  FileSignature,
  ShieldCheck,
  Ship,
  Banknote,
  SearchCheck,
  Scale,
} from "lucide-react";
import DealForm from "@/components/DealForm";

export const metadata: Metadata = {
  title: "The Deal Desk",
  description:
    "Independent trade brokerage. Submit an offer or a requirement. Vetted counterparties, papered introductions, success-fee only.",
  alternates: { canonical: "/brokerage" },
};

const STEPS = [
  {
    icon: FileSignature,
    title: "Tell us the deal",
    body: "Submit an offer or a requirement below. Product, origin, volume, terms. One page of facts, no marketing.",
  },
  {
    icon: SearchCheck,
    title: "We vet and match",
    body: "We work the network for a real counterparty, verify the essentials, and paper the introduction with an NCNDA and fee agreement before anyone meets.",
  },
  {
    icon: Handshake,
    title: "You close, we earn on success",
    body: "We stay in the middle until the deal is done. No retainer, no listing fee. Our commission is agreed in writing up front and paid only when the deal closes.",
  },
];

const LANES = [
  {
    icon: Ship,
    title: "Physical goods",
    body: "Commodities and manufactured goods across sectors. If there is a real seller, a real buyer, and a workable spread, we will look at it.",
  },
  {
    icon: Banknote,
    title: "Trade services",
    body: "Introductions to vetted freight, inspection, trade finance and compliance partners, on a disclosed referral basis.",
  },
  {
    icon: Scale,
    title: "Deal support",
    body: "Sanity checks on pricing, terms and counterparties before you commit, backed by the same evidence standard as our reports.",
  },
];

export default function BrokeragePage() {
  return (
    <>
      {/* Hero */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="pill">The Deal Desk</span>
        <h1
          className="serif text-white mt-6 mb-5 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}
        >
          Deals, brokered on{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>evidence</em>.
        </h1>
        <p className="text-[18px] text-gray-2 leading-relaxed max-w-2xl">
          Ponte is an independent trade brokerage. Three decades of global
          trade behind the desk, a vetted network of buyers, sellers and
          service partners, and one rule: every introduction is papered before
          it happens.
        </p>
      </header>

      {/* How it works */}
      <section className="container-px py-12 border-t border-white/8">
        <p className="eyebrow text-gold">How it works</p>
        <h2 className="serif text-white mt-3 mb-8" style={{ fontSize: 30, fontWeight: 500 }}>
          Three steps between your deal and a closed one.
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="glass p-7">
              <s.icon className="h-5 w-5 text-gold" />
              <h3 className="serif text-white text-lg mt-4" style={{ fontWeight: 500 }}>{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What we broker */}
      <section className="container-px py-12 border-t border-white/8">
        <p className="eyebrow text-gold">What we broker</p>
        <h2 className="serif text-white mt-3 mb-8" style={{ fontSize: 30, fontWeight: 500 }}>
          Goods, services, and the judgment in between.
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {LANES.map((l) => (
            <div key={l.title} className="card p-7">
              <l.icon className="h-5 w-5 text-gold" />
              <h3 className="serif text-white text-lg mt-4" style={{ fontWeight: 500 }}>{l.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-2">{l.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Submit a deal */}
      <section id="submit" className="container-px py-12 border-t border-white/8">
        <p className="eyebrow text-gold">Bring us a deal</p>
        <h2 className="serif text-white mt-3 mb-3" style={{ fontSize: 30, fontWeight: 500 }}>
          Submit an offer or a requirement.
        </h2>
        <p className="text-[15px] text-gray-2 max-w-2xl mb-8">
          Facts only: what, where, how much, on what terms. We reply within two
          business days. Nothing you submit is circulated without your
          agreement, and counterparty names stay confidential until both sides
          are papered.
        </p>
        <div className="max-w-2xl">
          <DealForm />
        </div>
      </section>

      {/* Trust strip */}
      <section className="container-px py-12 border-t border-white/8">
        <div className="glass p-8 md:p-10 grid gap-8 md:grid-cols-[auto_1fr] items-start">
          <ShieldCheck className="h-6 w-6 text-gold" />
          <div>
            <h3 className="serif text-white text-xl" style={{ fontWeight: 500 }}>
              Papered, or it does not happen.
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-gray-2 max-w-3xl">
              Every introduction runs under a non-circumvention and
              non-disclosure agreement and a written fee agreement, signed
              before counterparties are named. Ponte acts as broker and
              intermediary, never as principal, and earns only on closed
              deals. Brokerage services are provided by 1402 Celsius Ltd.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/network" className="btn-gold">
                Join the Deal Sheet <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact" className="btn-ghost-light">Talk to the desk</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
