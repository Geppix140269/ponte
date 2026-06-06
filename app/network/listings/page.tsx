import type { Metadata } from "next";
import { parseListingFilters } from "@/lib/network/listing-filters";
import { searchListings } from "@/lib/network/listing-search";
import { SavedSearches } from "@/components/network/SavedSearches";
import { listMySavedSearches } from "@/lib/network/saved-search-actions";
import { ListingsTerminal, type FeedListing } from "@/components/network/ListingsTerminal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Listings", robots: { index: false } };

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filters = parseListingFilters(searchParams);
  const listings = await searchListings(filters, { limit: 60 });
  const saved = await listMySavedSearches();

  const feed: FeedListing[] = listings.map((l) => ({
    id: l.id,
    listing_type: l.listing_type,
    commodity: l.commodity,
    hs_code: l.hs_code,
    quantity: l.quantity,
    unit: l.unit,
    origin_country: l.origin_country,
    destination_country: l.destination_country,
    price_cents: l.price_cents,
    price_on_request: l.price_on_request,
    currency: l.currency,
    created_at: l.created_at,
    owner: l.owner
      ? { company: l.owner.company, trust_score: l.owner.trust_score, verified_trader: l.owner.verified_trader }
      : null,
  }));

  return (
    <div className="container-px max-w-container mx-auto">
      <ListingsTerminal listings={feed}>
        <form method="GET" className="glass p-5 mt-2 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <input name="commodity" defaultValue={searchParams.commodity ?? ""} placeholder="Commodity" className="field" />
          <input name="origin" defaultValue={searchParams.origin ?? ""} placeholder="Origin" className="field" />
          <input name="destination" defaultValue={searchParams.destination ?? ""} placeholder="Destination" className="field" />
          <input name="hsCode" defaultValue={searchParams.hsCode ?? ""} placeholder="HS code" className="field" />
          <select name="listingType" defaultValue={searchParams.listingType ?? ""} className="field">
            <option value="">Any side</option>
            <option value="offer">Sell (offers)</option>
            <option value="request">Buy (requests)</option>
          </select>
          <select name="minTrustScore" defaultValue={searchParams.minTrustScore ?? ""} className="field">
            <option value="">Any trust</option>
            <option value="50">Trust 50+</option>
            <option value="70">Trust 70+</option>
            <option value="85">Trust 85+</option>
          </select>
          <input name="company" defaultValue={searchParams.company ?? ""} placeholder="Company" className="field sm:col-span-2" />
          <label className="inline-flex items-center gap-2 text-[13px] text-gray-2">
            <input type="checkbox" name="verifiedOnly" value="true" defaultChecked={searchParams.verifiedOnly === "true"} /> Verified traders only
          </label>
          <button type="submit" className="btn-gold sm:col-span-1">Search</button>
        </form>
        <SavedSearches current={filters} saved={saved} />
      </ListingsTerminal>
    </div>
  );
}
