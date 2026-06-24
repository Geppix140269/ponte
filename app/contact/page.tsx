import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone, Mail, FileText } from "lucide-react";

// Calendly account link (same as the Analyst Desk). Point at a dedicated
// Stripe-enabled "Analyst Call" event for one-step payment when ready.
const CALENDLY_URL = "https://calendly.com/hello-giuseppefunaro";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to Ponte. Book a senior analyst, scope a strategy intensive or retainer, or commission a Full Market Report.",
  alternates: { canonical: "/contact" },
};

const LEAD: Record<string, string> = {
  "strategy-intensive":
    "You are after a Strategy Intensive: a half-day with a senior analyst and a written brief. Tell us the decision and we will scope it.",
  retainer:
    "You are considering a Trade Desk Retainer: a standing analyst on call. Tell us the cadence and the kinds of questions you expect, and we will propose a monthly block.",
  "MR-001":
    "You want a Full Market Report. Tell us the HS code or product and whether you need it Global or for a single country.",
};

export default function ContactPage({
  searchParams,
}: {
  searchParams: { engagement?: string; product?: string };
}) {
  const key = searchParams.engagement ?? searchParams.product ?? "";
  const lead =
    LEAD[key] ??
    "Tell us the decision you are weighing. A senior analyst will come back to you, usually within one business day.";

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
          <div className="glass p-8 flex flex-col">
            <Phone className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>Book an analyst call</h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-gray-2">
              Sixty minutes with a senior analyst on one decision, with a written recap. $500.
            </p>
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="btn-gold mt-6">
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

          <div className="glass p-8 flex flex-col">
            <FileText className="h-5 w-5 text-gold" />
            <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>Commission a report</h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-gray-2">
              The Full Market Report for one HS code or product, Global or single country. $1,800.
            </p>
            <Link href="/product/full-market-report" className="btn-ghost-light mt-6">
              Order a report
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
