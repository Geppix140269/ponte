import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Ship, Boxes } from "lucide-react";
import { getListing } from "@/lib/network/listing-search";
import { EnquireButton } from "@/components/network/EnquireButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Listing", robots: { index: false } };

function price(l: { price_on_request: boolean; price_cents: number | null; currency: string }): string {
  if (l.price_on_request || l.price_cents == null) return "On request";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: l.currency || "USD", maximumFractionDigits: 0 }).format(l.price_cents / 100);
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const listing = await getListing(params.id);
  if (!listing) notFound();
  const isPublic = listing.status === "active" && listing.moderation_status === "approved";

  return (
    <section className="container-px py-12 max-w-container mx-auto">
      <Link href="/network/listings" className="text-gold text-sm hover:text-ink">← All listings</Link>
      <div className="glass p-8 md:p-10 mt-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="badge-gold uppercase">{listing.listing_type}</span>
            <h1 className="serif text-ink mt-3" style={{ fontSize: 32, fontWeight: 500 }}>{listing.commodity}</h1>
          </div>
          <span className="serif text-ink text-2xl" style={{ fontWeight: 500 }}>{price(listing)}</span>
        </div>

        {!isPublic && (
          <p className="mt-4 badge">Moderation: {listing.moderation_status}</p>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-[14px]">
          <Detail icon={<MapPin className="h-4 w-4 text-gold" />} label="Origin" value={listing.origin_country} />
          <Detail icon={<MapPin className="h-4 w-4 text-gold" />} label="Destination" value={listing.destination_country} />
          <Detail icon={<Boxes className="h-4 w-4 text-gold" />} label="Quantity" value={listing.quantity != null ? `${listing.quantity} ${listing.unit ?? ""}` : null} />
          <Detail icon={<Ship className="h-4 w-4 text-gold" />} label="Incoterms / Port" value={[listing.incoterms, listing.loading_port].filter(Boolean).join(" · ") || null} />
          <Detail label="HS code" value={listing.hs_code} />
        </div>

        {listing.specifications && (
          <div className="mt-8">
            <p className="mono text-[10px] text-gray-2 uppercase" style={{ letterSpacing: "0.18em" }}>Specifications</p>
            <p className="mt-2 text-[14px] text-gray-2 leading-relaxed whitespace-pre-line">{listing.specifications}</p>
          </div>
        )}

        {listing.owner && (
          <div className="mt-8 pt-6 border-t border-rule flex items-center justify-between">
            <div>
              <p className="text-ink text-[15px]">{listing.owner.company ?? listing.owner.full_name}</p>
              <p className="text-[12px] text-gray-2">{listing.owner.country} · trust {listing.owner.trust_score} · {listing.owner.verification_level.replace("_", " ")}</p>
            </div>
            <div className="flex items-center gap-3">
              <EnquireButton listingId={listing.id} />
              <Link href={`/network/profile/${listing.owner.id}`} className="btn-outline">View profile</Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Detail({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="mono text-[10px] text-gray-2 uppercase inline-flex items-center gap-1.5" style={{ letterSpacing: "0.18em" }}>{icon}{label}</p>
      <p className="mt-1 text-ink">{value}</p>
    </div>
  );
}
