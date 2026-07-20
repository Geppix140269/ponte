import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, EyeOff, UserCheck, Handshake } from "lucide-react";
import NetworkForm from "@/components/NetworkForm";

export const metadata: Metadata = {
  title: "The Deal Sheet",
  description:
    "The weekly email digest of the Ponte marketplace: live, anonymized listings delivered to vetted members. Free to join, introductions papered before they happen.",
  alternates: { canonical: "/network" },
};

const RULES = [
  {
    icon: EyeOff,
    title: "Anonymized by default",
    body: "Every item is a vetted marketplace listing: product, origin, volume, terms, never the counterparty. Names are disclosed only after both sides sign the NCNDA and fee terms.",
  },
  {
    icon: UserCheck,
    title: "Vetted personally",
    body: "Every member is approved by Ponte Trade before they receive anything. No open signups, no scraped lists, no brokers-of-brokers chains.",
  },
  {
    icon: Handshake,
    title: "Introductions, papered",
    body: "Reply to any item and we run the process: verification, paperwork, then the introduction. We earn a success fee on closed deals, members pay nothing to receive the sheet.",
  },
];

export default function NetworkPage() {
  return (
    <>
      {/* Hero */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="pill">The Deal Sheet</span>
        <h1
          className="serif text-white mt-6 mb-5 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}
        >
          One email a week.{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>Live deals</em>, no noise.
        </h1>
        <p className="text-[18px] text-gray-2 leading-relaxed max-w-2xl">
          The Deal Sheet is the weekly email digest of the{" "}
          <Link href="/marketplace" className="text-gold hover:text-cream">marketplace</Link>:
          the vetted listings that went live that week, what is for sale,
          what is wanted, and on what terms. One list, two doors: browse it
          on the board, or get it in your inbox.
        </p>
      </header>

      {/* Rules */}
      <section className="container-px py-12 border-t border-white/8">
        <p className="eyebrow text-gold">How the sheet works</p>
        <h2 className="serif text-white mt-3 mb-8" style={{ fontSize: 30, fontWeight: 500 }}>
          Built on discretion, run on paperwork.
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {RULES.map((r) => (
            <div key={r.title} className="glass p-7">
              <r.icon className="h-5 w-5 text-gold" />
              <h3 className="serif text-white text-lg mt-4" style={{ fontWeight: 500 }}>{r.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-2">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample item */}
      <section className="container-px py-12 border-t border-white/8">
        <p className="eyebrow text-gold">What an item looks like</p>
        <div className="mt-6 max-w-2xl glass p-7">
          <div className="flex items-center gap-2 text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.2em" }}>
            <Mail className="h-3.5 w-3.5 text-gold" />
            Deal Sheet · sample item
          </div>
          <p className="mono mt-4 text-[13px] leading-relaxed text-cream">
            OFFER · Refined sunflower oil · Origin: Black Sea region ·
            2,000 MT monthly, 12-month program · CIF Mediterranean ·
            Price on application · Seller verified, export docs in order.
            Ref PT-0142.
          </p>
          <p className="mt-4 text-[12px] text-gray-2">
            Interested members reply with the reference. We verify fit, both
            sides sign, then we introduce. That is the whole process.
          </p>
        </div>
      </section>

      {/* Join */}
      <section id="join" className="container-px py-12 border-t border-white/8">
        <p className="eyebrow text-gold">Join</p>
        <h2 className="serif text-white mt-3 mb-3" style={{ fontSize: 30, fontWeight: 500 }}>
          Request access.
        </h2>
        <p className="text-[15px] text-gray-2 max-w-2xl mb-8">
          Tell us who you are and what you trade. Approval is personal and
          usually quick. If you have a live deal today, go straight to{" "}
          <Link href="/brokerage#submit" className="text-gold hover:text-cream">the Deal Desk</Link>.
        </p>
        <div className="max-w-2xl">
          <NetworkForm />
        </div>
      </section>

      {/* Cross-CTA */}
      <section className="container-px py-12">
        <div className="glass p-10 text-center">
          <h2 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>
            Have a deal that cannot wait for Friday?
          </h2>
          <p className="mt-3 text-[15px] text-gray-2 max-w-xl mx-auto">
            Bring it to the Deal Desk and we will work it directly.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link href="/brokerage#submit" className="btn-gold">
              Submit a deal <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="btn-ghost-light">Talk to the desk</Link>
          </div>
        </div>
      </section>
    </>
  );
}
