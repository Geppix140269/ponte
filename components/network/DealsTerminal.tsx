"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import "@/app/ponte-landing.css";

export type DealRow = {
  id: string;
  title: string | null;
  stage: string;
  created_at: string;
  updated_at: string | null;
  counterpartyCompany: string | null;
  counterpartyTrust: number | null;
  counterpartyVerified: boolean;
  commodity: string | null;
  listingType: string | null;
  priceCents: number | null;
  currency: string | null;
};

const PIPELINE = ["enquiry", "offer", "negotiation", "closed"] as const;
const STAGE_LABEL: Record<string, string> = {
  enquiry: "Enquiry", offer: "Offer", negotiation: "Negotiation", closed: "Closed", cancelled: "Cancelled",
};
function stageProgress(stage: string): number {
  if (stage === "cancelled") return 0;
  const i = PIPELINE.indexOf(stage as (typeof PIPELINE)[number]);
  return i < 0 ? 10 : Math.round(((i + 1) / PIPELINE.length) * 100);
}
function initials(name: string | null): string {
  if (!name) return "··";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "··";
}
function value(d: DealRow): string {
  if (d.priceCents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: d.currency || "USD", maximumFractionDigits: 0 }).format(d.priceCents / 100);
}
function ago(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
}

export function DealsTerminal({ deals }: { deals: DealRow[] }) {
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); }, []);
  const counts = PIPELINE.map((st) => ({ st, n: deals.filter((d) => d.stage === st).length }));
  const active = deals.filter((d) => d.stage !== "closed" && d.stage !== "cancelled").length;

  return (
    <div className="ponte-terminal" data-theme="light">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="section__head">
          <div>
            <span className="eyebrow"><span className="eyebrow__no">02</span> Deal rooms</span>
            <h2 className="section__title">Your deals, in motion.</h2>
            <p className="section__lede">{active} active · {deals.length} total. Secured by ponte from enquiry to settlement.</p>
          </div>
          <div className="section__filters" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {counts.map((c) => (
              <span key={c.st} className="feed__live" style={{ gap: 6 }}>
                <span className="mono" style={{ color: "var(--ink)", fontSize: 13 }}>{c.n}</span> {STAGE_LABEL[c.st]}
              </span>
            ))}
          </div>
        </div>

        <div className="feed" style={{ marginTop: 18 }}>
          <div className="feed__head feed__row" style={{ gridTemplateColumns: "120px 1.5fr 1.2fr 0.9fr 1.1fr 0.7fr 60px" }}>
            <span className="col">Stage</span>
            <span className="col">Deal</span>
            <span className="col">Counterparty</span>
            <span className="col num">Value</span>
            <span className="col">Progress</span>
            <span className="col">Updated</span>
            <span className="col col--act" />
          </div>
          <div className="feed__body">
            {deals.map((d) => {
              const pct = stageProgress(d.stage);
              const cls = d.stage === "closed" ? "tscore" : d.stage === "cancelled" ? "tscore tscore--low" : "tscore tscore--mid";
              return (
                <Link key={d.id} href={`/network/deals/${d.id}`} className="feed__row" style={{ gridTemplateColumns: "120px 1.5fr 1.2fr 0.9fr 1.1fr 0.7fr 60px", textDecoration: "none", color: "inherit" }}>
                  <span className="col">
                    <span className={`sidepill ${d.stage === "closed" ? "sidepill--buy" : d.stage === "cancelled" ? "sidepill--sell" : ""}`} style={d.stage !== "closed" && d.stage !== "cancelled" ? { background: "color-mix(in srgb, var(--warn) 16%, var(--surface))", color: "var(--warn)" } : undefined}>
                      {STAGE_LABEL[d.stage] ?? d.stage}
                    </span>
                  </span>
                  <span className="col">
                    <div className="cmname">{d.title ?? d.commodity ?? "Deal"}</div>
                    {d.commodity && d.title && <div className="cmsub">{d.commodity}</div>}
                  </span>
                  <span className="col">
                    <span className="brokpill">
                      <span className="brokpill__init">{initials(d.counterpartyCompany)}</span>
                      <span>{d.counterpartyCompany ?? "Pending"}</span>
                      {d.counterpartyVerified && <span className="brokpill__ck" title="Verified trader">✓</span>}
                    </span>
                  </span>
                  <span className="col num">{value(d)}</span>
                  <span className="col">
                    <span className={cls}><span className="tscore__bar"><span className="tscore__fill" style={{ width: `${pct}%` }} /></span></span>
                  </span>
                  <span className="col age">{now ? ago(d.updated_at ?? d.created_at) : ""}</span>
                  <span className="col col--act"><span className="iconbtn">→</span></span>
                </Link>
              );
            })}
            {deals.length === 0 && (
              <div className="feed__row" style={{ gridTemplateColumns: "1fr" }}>
                <span className="mute" style={{ padding: "8px 0" }}>No deals yet. Open a deal room from any listing to start one.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
