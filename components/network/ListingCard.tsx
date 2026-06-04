import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { ListingWithOwner } from "@/lib/network/listing-search";

function price(l: ListingWithOwner): string {
  if (l.price_on_request || l.price_cents == null) return "On request";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: l.currency || "USD", maximumFractionDigits: 0 })
    .format(l.price_cents / 100);
}

export function ListingCard({ listing }: { listing: ListingWithOwner }) {
  const route = listing.origin_country
    ? `${listing.origin_country}${listing.destination_country ? ` → ${listing.destination_country}` : ""}`
    : null;
  return (
    <Link href={`/network/listings/${listing.id}`} className="card group p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="badge-gold uppercase">{listing.listing_type}</span>
        {listing.owner?.verified_broker && (
          <span className="inline-flex items-center gap-1 text-[10px] text-positive uppercase" style={{ letterSpacing: "0.16em" }}>
            <ShieldCheck className="h-3.5 w-3.5" />Verified
          </span>
        )}
      </div>
      <h3 className="serif text-white text-lg leading-snug" style={{ fontWeight: 500 }}>{listing.commodity}</h3>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-2">
        {route && <span>{route}</span>}
        {listing.quantity != null && <span>{listing.quantity} {listing.unit ?? ""}</span>}
        {listing.incoterms && <span>{listing.incoterms}</span>}
        {listing.hs_code && <span className="mono">HS {listing.hs_code}</span>}
      </div>
      <div className="mt-5 pt-4 border-t border-white/10 flex items-end justify-between">
        <div>
          <span className="serif text-white text-lg" style={{ fontWeight: 500 }}>{price(listing)}</span>
          {listing.owner?.company && <p className="text-[11px] text-gray-2 mt-1">{listing.owner.company} · trust {listing.owner.trust_score}</p>}
        </div>
        <ArrowRight className="h-4 w-4 text-gold transition-colors group-hover:text-cream" />
      </div>
    </Link>
  );
}
