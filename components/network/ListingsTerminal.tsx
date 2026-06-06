"use client";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import "@/app/ponte-landing.css";

export type FeedListing = {
  id: string;
  listing_type: "offer" | "request" | string;
  commodity: string;
  hs_code: string | null;
  quantity: number | null;
  unit: string | null;
  origin_country: string | null;
  destination_country: string | null;
  price_cents: number | null;
  price_on_request: boolean | null;
  currency: string | null;
  created_at: string;
  owner: { company: string | null; trust_score: number; verified_trader: boolean } | null;
};

function initials(name: string | null): string {
  if (!name) return "··";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "··";
}
function fmtQty(q: number | null, unit: string | null): string {
  if (q == null) return "—";
  const n = q >= 1000 ? `${(q / 1000).toLocaleString("en-US", { maximumFractionDigits: q >= 100000 ? 0 : 1 })}K` : q.toLocaleString("en-US");
  return `${n} ${unit ?? "MT"}`;
}
function fmtPrice(l: FeedListing): ReactNode {
  if (l.price_on_request || l.price_cents == null) return <span className="mute">On request</span>;
  const v = new Intl.NumberFormat("en-US", { style: "currency", currency: l.currency || "USD", maximumFractionDigits: 0 }).format(l.price_cents / 100);
  return <>{v}<span className="mute">/{l.unit ?? "MT"}</span></>;
}
function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
}

export function ListingsTerminal({ listings, children }: { listings: FeedListing[]; children?: ReactNode }) {
  // Live "streaming" rate, purely cosmetic, mirrors the landing's pulse of life.
  const [rate, setRate] = useState(12.4);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setRate((r) => Math.max(6, Math.min(28, +(r + (Math.random() - 0.5) * 2.2).toFixed(1)))), 2600);
    setNow(Date.now());
    return () => clearInterval(t);
  }, []);

  return (
    <div className="ponte-terminal" data-theme="light">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="section__head">
          <div>
            <span className="eyebrow"><span className="eyebrow__no">01</span> Live offers</span>
            <h2 className="section__title">Offers and requests, in motion.</h2>
            <p className="section__lede">Direct from verified buyers and sellers. {listings.length} live · contact unlocks on mutual interest.</p>
          </div>
          <div className="section__filters" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="feed__live"><span className="pulse" /> Streaming · <span className="mono">{rate.toFixed(1)}</span>/min</span>
            <Link href="/network/listings/new" className="btn-gold inline-flex items-center gap-2"><Plus className="h-4 w-4" />New listing</Link>
          </div>
        </div>

        {children}

        <div className="feed" style={{ marginTop: 18 }}>
          <div className="feed__head feed__row">
            <span className="col col--side">Side</span>
            <span className="col col--cm">Commodity</span>
            <span className="col col--qty num">Quantity</span>
            <span className="col col--corr">Corridor</span>
            <span className="col col--price num">Indication</span>
            <span className="col col--poster">Posted by</span>
            <span className="col col--age">Posted</span>
            <span className="col col--act" />
          </div>
          <div className="feed__body">
            {listings.map((l, i) => {
              const sell = l.listing_type === "offer";
              const corr = l.origin_country
                ? [l.origin_country, l.destination_country].filter(Boolean)
                : [l.destination_country].filter(Boolean);
              return (
                <Link key={l.id} href={`/network/listings/${l.id}`} className={`feed__row${now && i < 3 ? " is-new" : ""}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <span className="col col--side">
                    <span className={`sidepill sidepill--${sell ? "sell" : "buy"}`}><span>{sell ? "↓" : "↑"}</span> {sell ? "SELL" : "BUY"}</span>
                  </span>
                  <span className="col col--cm">
                    <div className="cmname">{l.commodity}</div>
                    {l.hs_code && <div className="cmsub">HS {l.hs_code}</div>}
                  </span>
                  <span className="col col--qty num">{fmtQty(l.quantity, l.unit)}</span>
                  <span className="col col--corr">
                    {corr.length ? (
                      <span className="corr">
                        {corr.map((c, j) => (
                          <span key={j}>{j > 0 && <span className="corr__arrow">→ </span>}{c}</span>
                        ))}
                      </span>
                    ) : <span className="mute">—</span>}
                  </span>
                  <span className="col col--price num">{fmtPrice(l)}</span>
                  <span className="col col--poster">
                    <span className="brokpill">
                      <span className="brokpill__init">{initials(l.owner?.company ?? null)}</span>
                      <span>{l.owner?.company ?? "Unlisted"}</span>
                      {l.owner?.verified_trader && <span className="brokpill__ck" title="Verified trader">✓</span>}
                    </span>
                  </span>
                  <span className="col col--age age">{now ? ago(l.created_at) : ""}</span>
                  <span className="col col--act"><span className="iconbtn">→</span></span>
                </Link>
              );
            })}
            {listings.length === 0 && (
              <div className="feed__row" style={{ gridTemplateColumns: "1fr" }}>
                <span className="mute" style={{ padding: "8px 0" }}>No listings match your filters. Adjust the search above or post the first one.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
