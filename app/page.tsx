import Link from "next/link";
import {
  ArrowRight,
  Phone,
  Handshake,
  Mail,
  CalendarClock,
  ShieldCheck,
  Scale,
  Globe2,
  MapPin,
} from "lucide-react";

export const revalidate = 60;

const pillars = [
  {
    icon: Handshake,
    eyebrow: "Success fee only",
    title: "The Deal Desk",
    body: "Bring an offer or a requirement. We vet the counterparty, paper the introduction, and stay in the middle until the deal closes.",
    href: "/brokerage",
    cta: "Bring us a deal",
  },
  {
    icon: Mail,
    eyebrow: "Free · vetted",
    title: "The Deal Sheet",
    body: "One email a week with live, anonymized offers and requirements moving through the network. Reply to any item and we run the introduction.",
    href: "/network",
    cta: "Request access",
  },
  {
    icon: Phone,
    eyebrow: "From $500",
    title: "The Analyst Desk",
    body: "Book a senior analyst for one decision. A 60-minute call with a written recap, a half-day intensive, or a standing retainer.",
    href: "/advisory",
    cta: "Book an analyst call",
  },
];

const reportVariants = [
  {
    icon: Globe2,
    title: "Global",
    body: "The whole picture for one HS code or product across world markets: where demand sits, who trades it, and the regulatory landscape.",
  },
  {
    icon: MapPin,
    title: "Single destination country",
    body: "The same depth, focused on one target market: demand, tariffs and landed cost, the competitive field, and active counterparties.",
  },
];

const why = [
  {
    icon: ShieldCheck,
    title: "Senior analyst sign-off",
    body: "Every report and every call is the work of a senior analyst, reviewed and signed off before it reaches you. Not an automated feed.",
  },
  {
    icon: Scale,
    title: "Evidence, not opinion",
    body: "Grounded in transaction-level trade evidence and official sources, with citations. You see where every claim comes from.",
  },
  {
    icon: CalendarClock,
    title: "Priced by the engagement",
    body: "Book a call, commission a report, or retain a desk. One-time or retainer, never a subscription you forget to cancel.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ============ HERO ============ */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16 relative">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
          <div>
            <span className="pill">Independent trade brokerage</span>
            <h1
              className="serif text-white mt-6 mb-7"
              style={{ fontWeight: 400, fontSize: "clamp(48px, 7vw, 92px)", lineHeight: 0.98, letterSpacing: "-0.015em" }}
            >
              The bridge{" "}
              <em className="text-gold italic" style={{ fontWeight: 400 }}>between</em>
              <br />
              buyer and seller.
            </h1>
            <p className="text-[18px] text-gray-2 leading-relaxed max-w-xl mb-9">
              Ponte is the independent brokerage of Giuseppe Funaro. Real
              offers, vetted counterparties, papered introductions, and a
              success fee only when the deal closes. Evidence over opinion,
              in every deal.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <Link href="/brokerage#submit" className="btn-gold">
                Bring us a deal <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/network" className="btn-ghost-light">
                Join the Deal Sheet
              </Link>
            </div>
          </div>

          {/* Deal Desk panel */}
          <div className="relative hidden md:block">
            <div className="glass p-8 max-w-[420px] ml-auto">
              <div className="flex items-center gap-[10px] text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.24em" }}>
                <span className="w-[6px] h-[6px] rounded-full bg-positive pulse-dot" style={{ boxShadow: "0 0 10px var(--positive)" }} />
                Open · The Deal Desk
              </div>
              <div className="serif text-white mt-4" style={{ fontWeight: 500, fontSize: 84, lineHeight: 1, letterSpacing: "-0.02em" }}>
                48
                <span className="text-gold italic" style={{ fontSize: 30 }}>h</span>
              </div>
              <div className="text-[13px] text-gray-2 mt-1" style={{ letterSpacing: "0.04em" }}>
                From your submission to a first answer
              </div>
              <Link href="/brokerage#submit" className="btn-gold mt-7 w-full justify-center">
                Submit a deal <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-4 mono text-[11px] text-gray-2 text-center">NCNDA · fee agreement · success fee only</p>
            </div>
          </div>
        </div>
      </header>

      {/* ============ WHAT WE DO ============ */}
      <section className="container-px py-12 border-t border-white/8">
        <p className="eyebrow text-gold">What we do</p>
        <h2 className="serif text-white mt-3 mb-8" style={{ fontSize: 30, fontWeight: 500 }}>
          Deals brokered, opportunities shared, decisions backed.
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {pillars.map((p) => (
            <Link key={p.title} href={p.href} className="card group p-7">
              <div className="flex items-center justify-between mb-4">
                <p.icon className="h-5 w-5 text-gold" />
                <span className="mono text-[11px] text-gray-2 uppercase" style={{ letterSpacing: "0.12em" }}>{p.eyebrow}</span>
              </div>
              <h3 className="serif text-white text-xl" style={{ fontWeight: 500 }}>{p.title}</h3>
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-gray-2">{p.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[11px] uppercase text-gold group-hover:text-cream" style={{ letterSpacing: "0.18em" }}>
                {p.cta} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ THE REPORT ============ */}
      <section className="container-px py-12 border-t border-white/8">
        <p className="eyebrow text-gold">The report</p>
        <h2 className="serif text-white mt-3 mb-3" style={{ fontSize: 30, fontWeight: 500 }}>
          One report, two ways to scope it.
        </h2>
        <p className="text-[15px] text-gray-2 max-w-2xl mb-8">
          The Full Market Report covers one HS code or product, with senior-analyst sign-off before it ships. Both variants are $1,800.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {reportVariants.map((v) => (
            <Link key={v.title} href="/product/full-market-report" className="card group p-7">
              <div className="flex items-center justify-between mb-3">
                <span className="badge-gold uppercase">{v.title}</span>
                <span className="serif text-white text-lg" style={{ fontWeight: 500 }}>$1,800</span>
              </div>
              <v.icon className="h-5 w-5 text-gold mt-1" />
              <p className="mt-3 flex-1 text-[14px] leading-relaxed text-gray-2">{v.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[11px] uppercase text-gold group-hover:text-cream" style={{ letterSpacing: "0.18em" }}>
                Commission this report <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ WHY PONTE ============ */}
      <section className="container-px py-12 border-t border-white/8">
        <p className="eyebrow text-gold">Why Ponte</p>
        <h2 className="serif text-white mt-3 mb-8" style={{ fontSize: 30, fontWeight: 500 }}>
          A senior analyst, on the record.
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {why.map((w) => (
            <div key={w.title} className="glass p-7">
              <w.icon className="h-5 w-5 text-gold" />
              <h3 className="serif text-white text-lg mt-4" style={{ fontWeight: 500 }}>{w.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-2">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="container-px py-16">
        <div className="glass p-10 md:p-12 text-center">
          <h2 className="serif text-white" style={{ fontSize: 36, fontWeight: 500 }}>
            Have a deal? Bring it to the desk.
          </h2>
          <p className="mt-4 text-[16px] text-gray-2 max-w-xl mx-auto">
            An offer, a requirement, or a question worth an analyst&rsquo;s
            hour. Papered, vetted, evidence over opinion.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/brokerage#submit" className="btn-gold">
              Submit a deal <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/advisory" className="btn-ghost-light">Book an analyst call</Link>
          </div>
        </div>
      </section>
    </>
  );
}
