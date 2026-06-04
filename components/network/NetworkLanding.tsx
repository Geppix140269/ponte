import Link from "next/link";
import { ShieldCheck, Search, Handshake, FileSearch, ArrowRight, BadgeCheck, Lock } from "lucide-react";

export function NetworkLanding() {
  return (
    <div>
      {/* Hero */}
      <section className="container-px pt-20 pb-16 max-w-container mx-auto">
        <p className="mono text-[11px] text-gold uppercase" style={{ letterSpacing: "0.24em" }}>Powered by ADAMftd · grounded verified data</p>
        <h1 className="serif text-white mt-5" style={{ fontSize: 56, fontWeight: 500, lineHeight: 1.05 }}>
          Build Trust. <span className="text-gold">Trade Smarter.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] text-gray-2 leading-relaxed">
          A professional network for commodity brokers, traders, and counterparties. Verify who you
          are dealing with, publish opportunities, and negotiate in trusted deal rooms, backed by
          ADAMftd trade intelligence and 7B+ verified trade records.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/network/listings" className="btn-gold inline-flex items-center gap-2">Browse listings <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/pricing" className="badge-gold px-5 py-2.5">See pricing</Link>
          <Link href="/network/verify" className="badge px-5 py-2.5">Verify a counterparty</Link>
        </div>
      </section>

      {/* How it works */}
      <Section eyebrow="01 / How it works" title="From handshake to closed deal, with trust at every step">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Step icon={<BadgeCheck className="h-5 w-5 text-gold" />} n="i" title="Build your profile" body="Verify your identity and company. Earn a trust score and the Verified Broker badge." />
          <Step icon={<Search className="h-5 w-5 text-gold" />} n="ii" title="Publish or search" body="Post offers and requests, or search by commodity, corridor, trust, and verification." />
          <Step icon={<FileSearch className="h-5 w-5 text-gold" />} n="iii" title="Verify with ADAMftd" body="Screen a counterparty against sanctions, registries, and real customs records." />
          <Step icon={<Handshake className="h-5 w-5 text-gold" />} n="iv" title="Close in a deal room" body="Negotiate privately. Exchange contact only after mutual acceptance." />
        </div>
      </Section>

      {/* Trust & verification */}
      <Section eyebrow="02 / Trust & verification" title="Trust is the product. Listings are secondary.">
        <div className="grid gap-5 lg:grid-cols-3">
          <Card title="Trust score" body="Every account carries a 0-100 trust score that rises with verification and completed deals, and falls on reports or suspicious activity." />
          <Card title="Five verification levels" body="From email to fully verified. Company verification is backed by official registry data through ADAMftd." />
          <Card title="Sanctions screening" body="Counterparties are screened against OFAC, EU, UN, and UK lists before you commit." />
        </div>
      </Section>

      {/* Broker profiles + deal rooms */}
      <Section eyebrow="03 / The network" title="Professional profiles. Private deal rooms.">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card icon={<ShieldCheck className="h-5 w-5 text-gold" />} title="Broker profiles" body="LinkedIn-style profiles with trust scores, verification level, commodities, regions, and a real trading track record." />
          <Card icon={<Lock className="h-5 w-5 text-gold" />} title="Deal rooms" body="A five-stage pipeline with messaging, documents, and an activity log. Contact details stay hidden until both sides agree." />
        </div>
      </Section>

      {/* ADAMftd */}
      <Section eyebrow="04 / ADAMftd verification" title="Due diligence, grounded in real trade data">
        <div className="glass p-8 lg:p-10">
          <p className="text-[16px] text-gray-2 leading-relaxed max-w-3xl">
            Verify with ADAMftd checks whether a counterparty is sanctions-clear, legally registered,
            and actually trades the commodity and corridor they claim, drawn from 7B+ verified customs
            records across 199 countries. It does not certify legitimacy; it gives you grounded
            intelligence signals so you can decide with confidence.
          </p>
          <Link href="/network/verify" className="btn-gold mt-7 inline-flex items-center gap-2">Run a verification <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </Section>

      {/* Market intelligence (the report store as a section) */}
      <Section eyebrow="05 / Market intelligence" title="Premium grounded research, when you need it">
        <div className="glass p-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[15px] text-gray-2 max-w-2xl">Specific, analyst-curated trade-intelligence reports for a country, corridor, or product, delivered as licensed PDFs. The same ADAMftd data that powers verification.</p>
          <Link href="/catalogue" className="badge-gold px-5 py-2.5">Browse reports</Link>
        </div>
      </Section>

      {/* FAQ */}
      <Section eyebrow="06 / FAQ" title="Questions, answered">
        <div className="grid gap-4 lg:grid-cols-2">
          <Faq q="Is this a marketplace?" a="No. It is a professional broker network where trust, verification, and deal management come first. Listings exist to start conversations, not to transact anonymously." />
          <Faq q="How does verification work?" a="You request verification levels (email, phone, company, ID, trade reference). Company checks draw on official registries and customs data via ADAMftd." />
          <Faq q="Can free users exchange contact details?" a="No. Direct contact is exchanged only inside a deal room, after both parties accept, and only on paid plans." />
          <Faq q="What does ADAMftd verification cost me?" a="It is metered by plan (Starter 1/mo, Pro 10/mo). Results are cached and shared, so a counterparty is never re-billed within the window." />
        </div>
      </Section>

      {/* CTA */}
      <section className="container-px py-20 max-w-container mx-auto text-center">
        <h2 className="serif text-white" style={{ fontSize: 40, fontWeight: 500 }}>Trade with people you can trust.</h2>
        <p className="mt-4 text-[16px] text-gray-2">Join the verified network for global trade.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/pricing" className="btn-gold">Get started</Link>
          <Link href="/network/listings" className="badge px-5 py-2.5">Explore listings</Link>
        </div>
      </section>
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="container-px py-14 max-w-container mx-auto border-t border-white/8">
      <p className="mono text-[11px] text-gold uppercase" style={{ letterSpacing: "0.22em" }}>— {eyebrow}</p>
      <h2 className="serif text-white mt-3 mb-8" style={{ fontSize: 30, fontWeight: 500 }}>{title}</h2>
      {children}
    </section>
  );
}
function Step({ icon, n, title, body }: { icon: React.ReactNode; n: string; title: string; body: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">{icon}<span className="mono text-[11px] text-gray-2 uppercase">{n}</span></div>
      <h3 className="serif text-white text-lg" style={{ fontWeight: 500 }}>{title}</h3>
      <p className="mt-2 text-[13px] text-gray-2 leading-relaxed">{body}</p>
    </div>
  );
}
function Card({ icon, title, body }: { icon?: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card p-6">
      {icon && <div className="mb-3">{icon}</div>}
      <h3 className="serif text-white text-lg" style={{ fontWeight: 500 }}>{title}</h3>
      <p className="mt-2 text-[13px] text-gray-2 leading-relaxed">{body}</p>
    </div>
  );
}
function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="glass p-6">
      <p className="text-white text-[15px]" style={{ fontWeight: 500 }}>{q}</p>
      <p className="mt-2 text-[13px] text-gray-2 leading-relaxed">{a}</p>
    </div>
  );
}
