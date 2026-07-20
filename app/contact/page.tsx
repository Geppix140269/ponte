import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone, Mail, FileText } from "lucide-react";

// Calendly account link (same as the Analyst Desk). Point at a dedicated
// Stripe-enabled "Analyst Call" event for one-step payment when ready.
const CALENDLY_URL = "https://calendly.com/hello-giuseppefunaro";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to Ponte. Bring a deal to the desk, book a senior analyst, or scope a strategy intensive or retainer.",
  alternates: { canonical: "/contact" },
};

const LEAD: Record<string, string> = {
  "strategy-intensive":
    "You are after a Strategy Intensive: a half-day with a senior analyst and a written brief. Tell us the decision and we will scope it.",
  retainer:
    "You are considering a Trade Desk Retainer: a standing analyst on call. Tell us the cadence and the kinds of questions you expect, and we will propose a monthly block.",
};

export default function ContactPage({
  searchParams,
}: {
  searchParams: { engagement?: string; product?: string };
}) {
  const key = searchParams.engagement ?? searchParams.product ?? "";
  const lead =
    LEAD[key] ??
    "Tell us the deal on your desk, or the decision you are weighing. The desk replies within one business day.";

  return (
    <>
      <header className="container-px pt-14 pb-10 md:pt-20">
        <span className="pill">Contact</span>
        <h1
          className="serif text-white mt-6 mb-5 max-w-3xl"
          style={{ fontWeight: 400, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.0, letterSpacing: "-0.015em" }}
        >
          Let&rsquo;s talk.
        </h1>
        <p className="text-[18px] text-gray-2 leading-relaxed max-w-2xl">{lead}</p>
      </header>

      <section className="container-px pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="glass p-8 flex flex-col ring-1 ring-gold/40">
            <FileText className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>Bring us a deal</h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-gray-2">
              An offer or a requirement, goods or trade services. Facts only, papered before any introduction.
            </p>
            <Link href="/brokerage#submit" className="btn-gold mt-6">
              Go to the Deal Desk <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="glass p-8 flex flex-col">
            <Phone className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>Book an analyst call</h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-gray-2">
              Sixty minutes with a senior analyst on one decision, with a written recap. $500.
            </p>
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost-light mt-6">
              Book a call <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="glass p-8 flex flex-col">
            <Mail className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>Email us</h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-gray-2">
              For intensives, retainers, or anything bespoke. Tell us the decision and we will scope it.
            </p>
            <a
              href={`mailto:hello@ponte.trade${key ? `?subject=${encodeURIComponent("Enquiry: " + key)}` : ""}`}
              className="btn-ghost-light mt-6"
            >
              hello@ponte.trade
            </a>
          </div>

        </div>
      </section>
    </>
  );
}
