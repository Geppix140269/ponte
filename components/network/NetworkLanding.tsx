import Link from "next/link";
import {
  ShieldCheck, Search, Handshake, FileSearch, ArrowRight, BadgeCheck, Lock,
  Check, TrendingUp, Globe2, Building2,
} from "lucide-react";

const STATS = [
  { value: "7B+", label: "Verified trade records" },
  { value: "199", label: "Country profiles" },
  { value: "4", label: "Sanctions lists screened" },
  { value: "0-100", label: "Trust score on every account" },
];

const SAMPLE = [
  { type: "Offer", commodity: "Cocoa Beans", route: "Côte d'Ivoire → EU", qty: "500 MT · FOB", price: "$2,850 / MT", trust: 85, verified: true },
  { type: "Request", commodity: "Green Coffee (Arabica)", route: "Brazil → Netherlands", qty: "200 MT · CIF", price: "On request", trust: 72, verified: true },
  { type: "Offer", commodity: "Refined Sugar ICUMSA 45", route: "India → MENA", qty: "12,500 MT · CIF", price: "$540 / MT", trust: 64, verified: false },
];

const SOURCES = ["OFAC", "EU", "UN", "UK", "GLEIF", "UN Comtrade", "World Bank", "Eurostat"];

export function NetworkLanding() {
  return (
    <div>
      {/* ===== Hero ===== */}
      <section className="container-px pt-16 pb-12 max-w-container mx-auto">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="pill"><span className="pulse-dot" /> Powered by ADAMftd · grounded verified data</span>
            <h1 className="serif text-white mt-6" style={{ fontSize: 58, fontWeight: 500, lineHeight: 1.03 }}>
              Build Trust.<br /><span className="text-gold">Trade Smarter.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] text-gray-2 leading-relaxed">
              The verified network for real buyers, sellers, and trading houses. Trade directly
              with verified principals — no mandates, no daisy chains — and close in trusted deal
              rooms, backed by 7B+ verified trade records.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/network/listings" className="btn-gold inline-flex items-center gap-2">Browse the network <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/network/verify" className="btn-ghost-light">Verify a counterparty</Link>
            </div>
            <p className="mt-5 text-[12px] text-gray-2">Free to join · no card required · verification from day one</p>
          </div>

          {/* Verified-counterparty result mock */}
          <div className="glass p-6 lg:p-7 relative" style={{ boxShadow: "0 30px 80px -30px rgba(0,0,0,0.7)" }}>
            <div className="flex items-center justify-between">
              <span className="mono text-[10px] text-gray-2 uppercase" style={{ letterSpacing: "0.2em" }}>Verify with ADAMftd</span>
              <span className="badge-gold">MATCH · 92%</span>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-11 w-11 rounded-full grid place-items-center" style={{ background: "rgba(201,151,58,0.15)" }}>
                <Building2 className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-white text-[15px]" style={{ fontWeight: 500 }}>Rotterdam Commodity Partners BV</p>
                <p className="text-[12px] text-gray-2">Netherlands · trust 85 · Verified Trader</p>
              </div>
            </div>
            <div className="mt-6 space-y-2.5">
              {[
                ["Sanctions clear (OFAC · EU · UN · UK)", true],
                ["Company registered (GLEIF)", true],
                ["Trade activity confirmed in customs records", true],
                ["Commodity & corridor match the claim", true],
              ].map(([label, ok]) => (
                <div key={label as string} className="flex items-center gap-2.5 text-[13px]">
                  <span className="h-5 w-5 rounded-full grid place-items-center" style={{ background: "rgba(74,192,154,0.15)" }}>
                    <Check className="h-3.5 w-3.5 text-positive" />
                  </span>
                  <span className="text-gray-2">{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 pt-4 border-t border-white/10 text-[11px] text-gray-2">Grounded intelligence signals, not a certification. Illustrative result.</p>
          </div>
        </div>

        {/* stat band */}
        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          {STATS.map((s) => (
            <div key={s.label} className="bg-navy-800 px-6 py-7 text-center">
              <p className="serif text-gold" style={{ fontSize: 32, fontWeight: 500 }}>{s.value}</p>
              <p className="mt-1 mono text-[10px] text-gray-2 uppercase" style={{ letterSpacing: "0.16em" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Live on the network ===== */}
      <Section eyebrow="Live on the network" title="Real opportunities from verified counterparties">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE.map((l) => (
            <div key={l.commodity} className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="badge-gold uppercase">{l.type}</span>
                {l.verified && <span className="inline-flex items-center gap-1 text-[10px] text-positive uppercase" style={{ letterSpacing: "0.14em" }}><ShieldCheck className="h-3.5 w-3.5" />Verified</span>}
              </div>
              <h3 className="serif text-white text-lg" style={{ fontWeight: 500 }}>{l.commodity}</h3>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-gray-2">
                <span>{l.route}</span><span>·</span><span>{l.qty}</span>
              </div>
              <div className="mt-5 pt-4 border-t border-white/10 flex items-end justify-between">
                <span className="serif text-white text-lg" style={{ fontWeight: 500 }}>{l.price}</span>
                <span className="text-[11px] text-gray-2">trust {l.trust}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-7"><Link href="/network/listings" className="text-gold text-sm hover:text-cream inline-flex items-center gap-1.5">See all listings <ArrowRight className="h-4 w-4" /></Link></div>
      </Section>

      {/* ===== How it works ===== */}
      <Section eyebrow="How it works" title="From handshake to closed deal, with trust at every step">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Step icon={<BadgeCheck className="h-5 w-5 text-gold" />} n="01" title="Build your profile" body="Verify identity and company. Earn a trust score and the Verified Trader badge." />
          <Step icon={<Search className="h-5 w-5 text-gold" />} n="02" title="Publish or search" body="Post offers and requests, or search by commodity, corridor, trust, and verification." />
          <Step icon={<FileSearch className="h-5 w-5 text-gold" />} n="03" title="Verify with ADAMftd" body="Screen a counterparty against sanctions, registries, and real customs records." />
          <Step icon={<Handshake className="h-5 w-5 text-gold" />} n="04" title="Close in a deal room" body="Negotiate privately. Exchange contact only after mutual acceptance." />
        </div>
      </Section>

      {/* ===== Trust ===== */}
      <Section eyebrow="Trust & verification" title="Trust is the product. Listings are secondary.">
        <div className="grid gap-5 lg:grid-cols-3">
          <Card icon={<TrendingUp className="h-5 w-5 text-gold" />} title="Trust score" body="A 0-100 score on every account that rises with verification and completed deals, and falls on reports or suspicious activity." />
          <Card icon={<ShieldCheck className="h-5 w-5 text-gold" />} title="Five verification levels" body="From email to fully verified. Company verification is backed by official registry data through ADAMftd." />
          <Card icon={<Globe2 className="h-5 w-5 text-gold" />} title="Sanctions screening" body="Counterparties are screened against OFAC, EU, UN, and UK lists before you commit." />
        </div>
      </Section>

      {/* ===== Profiles + deal rooms ===== */}
      <Section eyebrow="The network" title="Professional profiles. Private deal rooms.">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card icon={<ShieldCheck className="h-5 w-5 text-gold" />} title="Company profiles" body="LinkedIn-style profiles with trust scores, verification level, commodities, regions, and a real trading track record drawn from customs data." />
          <Card icon={<Lock className="h-5 w-5 text-gold" />} title="Deal rooms" body="A five-stage pipeline with messaging, documents, and an activity log. Contact details stay hidden until both sides agree." />
        </div>
      </Section>

      {/* ===== Credibility row ===== */}
      <section className="container-px py-12 max-w-container mx-auto border-t border-white/8">
        <p className="text-center mono text-[10px] text-gray-2 uppercase mb-5" style={{ letterSpacing: "0.2em" }}>Verified against official sources</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {SOURCES.map((s) => <span key={s} className="badge">{s}</span>)}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <Section eyebrow="FAQ" title="Questions, answered">
        <div className="grid gap-4 lg:grid-cols-2">
          <Faq q="Is this a marketplace?" a="It is a verified trade network where trust, verification, and direct buyer-seller dealing come first. Listings exist to start conversations, not to transact anonymously." />
          <Faq q="How does verification work?" a="You request verification levels (email, phone, company, ID, trade reference). Company checks draw on official registries and customs data via ADAMftd." />
          <Faq q="Can free users exchange contact details?" a="No. Direct contact is exchanged only inside a deal room, after both parties accept, and only on paid plans." />
          <Faq q="What does ADAMftd verification cost me?" a="It is metered by plan (Starter 1/mo, Pro 10/mo). Results are cached and shared, so a counterparty is never re-billed within the window." />
        </div>
      </Section>

      {/* ===== CTA ===== */}
      <section className="container-px py-20 max-w-container mx-auto">
        <div className="glass p-12 text-center" style={{ background: "linear-gradient(180deg, rgba(201,151,58,0.08), rgba(255,255,255,0.04))" }}>
          <h2 className="serif text-white" style={{ fontSize: 40, fontWeight: 500 }}>Trade with people you can trust.</h2>
          <p className="mt-4 text-[16px] text-gray-2">Join the verified network for global trade.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/pricing" className="btn-gold">Get started free</Link>
            <Link href="/network/listings" className="btn-ghost-light">Explore listings</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="container-px py-14 max-w-container mx-auto border-t border-white/8">
      <p className="eyebrow text-gold">{eyebrow}</p>
      <h2 className="serif text-white mt-3 mb-8" style={{ fontSize: 30, fontWeight: 500 }}>{title}</h2>
      {children}
    </section>
  );
}
function Step({ icon, n, title, body }: { icon: React.ReactNode; n: string; title: string; body: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">{icon}<span className="mono text-[11px] text-gray-2">{n}</span></div>
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
