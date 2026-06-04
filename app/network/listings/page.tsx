import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { parseListingFilters } from "@/lib/network/listing-filters";
import { searchListings } from "@/lib/network/listing-search";
import { ListingCard } from "@/components/network/ListingCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Listings", robots: { index: false } };

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filters = parseListingFilters(searchParams);
  const listings = await searchListings(filters, { limit: 60 });

  return (
    <section className="container-px py-12 max-w-container mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="serif text-white" style={{ fontSize: 30, fontWeight: 500 }}>Listings</h1>
        <Link href="/network/listings/new" className="btn-gold inline-flex items-center gap-2"><Plus className="h-4 w-4" />New listing</Link>
      </div>

      <form method="GET" className="glass p-5 mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <input name="commodity" defaultValue={searchParams.commodity ?? ""} placeholder="Commodity" className="field" />
        <input name="origin" defaultValue={searchParams.origin ?? ""} placeholder="Origin" className="field" />
        <input name="destination" defaultValue={searchParams.destination ?? ""} placeholder="Destination" className="field" />
        <input name="hsCode" defaultValue={searchParams.hsCode ?? ""} placeholder="HS code" className="field" />
        <select name="listingType" defaultValue={searchParams.listingType ?? ""} className="field">
          <option value="">Any type</option>
          <option value="offer">Offer</option>
          <option value="request">Request</option>
        </select>
        <select name="minTrustScore" defaultValue={searchParams.minTrustScore ?? ""} className="field">
          <option value="">Any trust</option>
          <option value="50">Trust 50+</option>
          <option value="70">Trust 70+</option>
          <option value="85">Trust 85+</option>
        </select>
        <input name="company" defaultValue={searchParams.company ?? ""} placeholder="Company" className="field sm:col-span-2" />
        <label className="inline-flex items-center gap-2 text-[13px] text-gray-2">
          <input type="checkbox" name="verifiedOnly" value="true" defaultChecked={searchParams.verifiedOnly === "true"} /> Verified brokers only
        </label>
        <button type="submit" className="btn-gold sm:col-span-1">Search</button>
      </form>

      <p className="mt-6 text-[13px] text-gray-2">{listings.length} listing{listings.length === 1 ? "" : "s"}</p>
      <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
      {listings.length === 0 && (
        <div className="glass p-12 text-center mt-4">
          <p className="text-gray-2">No listings match your filters.</p>
        </div>
      )}
    </section>
  );
}
