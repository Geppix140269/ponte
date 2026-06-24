import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone, ClipboardList, CalendarClock } from "lucide-react";

// Calendly. This is the account link (shows all event types). For one-step
// payment, create a dedicated 60-min "Analyst Call" event with Stripe payment
// collection enabled, then point this at it:
//   https://calendly.com/hello-giuseppefunaro/analyst-call
const CALENDLY_URL = "https://calendly.com/hello-giuseppefunaro";

export const metadata: Metadata = {
  title: "The Analyst Desk",
  description:
    "Senior-led analyst access. Book a 60-minute analyst call, a half-day strategy intensive, or retain a standing trade desk. Talk to the analyst, not the algorithm.",
  alternates: { canonical: "/advisory" },
};

const TIERS = [
  {
    name: "Analyst Call",
    price: "$500",
    meta: "60 min · written recap",
    body: "Sixty focused minutes with a senior analyst on one decision, followed by a one-page written recap you can act on and share.",
    cta: "Book an analyst call",
    href: CALENDLY_URL,
    external: true,
  },
  {
    name: "Strategy Intensive",
    price: "$2,000",
    meta: "Half-day · brief included",
    body: "A half-day across two or three sessions for a decision with moving parts. You leave with a written brief: the evidence, the options, and a recommendation.",
    cta: "Start an intensive",
    href: "/contact?engagement=strategy-intensive",
    external: false,
    featured: true,
  },
  {
    name: "Trade Desk Retainer",
    price: "from $2,500",
    meta: "Per month · senior-led",
    body: "A standing analyst on call: a fixed monthly block of senior hours, priority turnaround, and a quarterly review. Cancel with 30 days notice.",
    cta: "Discuss a retainer",
    href: "/contact?engagement=retainer",
    external: false,
  },
];

const STEPS = [
  { icon: Phone, title: "Tell us the decision", body: "One line on what you are weighing: a market, a counterparty, a corridor, a risk." },
  { icon: ClipboardList, title: "Meet the analyst", body: "A senior analyst, not a chatbot, works your question against transaction-level trade evidence and official sources." },
  { icon: CalendarClock, title: "Leave with evidence", body: "A clear answer and a written record: what we found, what it means, and what we would do." },
];

export default function AdvisoryPage() {
  return (
    <>
      {/* Hero */}
      <header className="container-px pt-14 pb-12 md:pt-20 md:pb-16">
        <span className="pill">The Analyst Desk</span>
        <h1
          className="serif text-white mt-6 mb-6 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(40px, 6vw, 76px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}
        >
          Talk to the analyst,{" "}
          <em className="text-gold italic" style={{ fontWeight: 400 }}>not the algorithm.</em>
        </h1>
        <p className="text-[18px] text-gray-2 leading-relaxed max-w-xl mb-9">
          Direct, senior-led analyst access. Book a call, commission a brief, or
          retain a standing desk. Priced by the engagement, never by
          subscription. Evidence over opinion.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="btn-gold">
            Book an analyst call <ArrowRight className="h-4 w-4" />
          </a>
          <Link href="/contact" className="btn-ghost-light">Talk to us first</Link>
        </div>
      </header>

      {/* Engagement tiers */}
      <section className="container-px pb-16">
        <div className="grid gap-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`glass p-8 flex flex-col ${t.featured ? "ring-1 ring-gold/40" : ""}`}
            >
              {t.featured && <span className="badge-gold mb-4 self-start">Most chosen</span>}
              <h3 className="serif text-white text-2xl" style={{ fontWeight: 500 }}>{t.name}</h3>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="serif text-gold" style={{ fontSize: 34, fontWeight: 500 }}>{t.price}</span>
              </div>
              <p className="mt-1 mono text-[11px] uppercase text-gray-2" style={{ letterSpacing: "0.16em" }}>{t.meta}</p>
              <p className="mt-5 flex-1 text-[14px] leading-relaxed text-gray-2">{t.body}</p>
              {t.external ? (
                <a href={t.href} target="_blank" rel="noopener noreferrer" className="btn-gold mt-7">
                  {t.cta} <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <Link href={t.href} className="btn-ghost-light mt-7">{t.cta}</Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container-px pb-16">
        <p className="eyebrow text-gold">How it works</p>
        <h2 className="serif text-white mt-3 mb-8" style={{ fontSize: 30, fontWeight: 500 }}>
          From your question to evidence you can use.
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card p-7">
              <div className="flex items-center justify-between mb-4">
                <s.icon className="h-5 w-5 text-gold" />
                <span className="mono text-[11px] text-gray-2">{`0${i + 1}`}</span>
              </div>
              <h3 className="serif text-white text-lg" style={{ fontWeight: 500 }}>{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="container-px pb-24">
        <div className="glass p-10 md:p-12 text-center">
          <h2 className="serif text-white" style={{ fontSize: 34, fontWeight: 500 }}>
            Book the desk.
          </h2>
          <p className="mt-4 text-[16px] text-gray-2 max-w-xl mx-auto">
            One decision, sixty minutes, a senior analyst, and a written record. Start there.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="btn-gold">
              Book an analyst call <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/pricing" className="btn-ghost-light">See pricing</Link>
          </div>
        </div>
      </section>
    </>
  );
}
