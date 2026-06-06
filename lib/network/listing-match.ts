// Pure: does a listing match a saved search's filters? No I/O.
import type { ListingFilters } from "@/lib/network/listing-filters";

interface ListingLike {
  commodity: string;
  origin_country?: string | null;
  destination_country?: string | null;
  listing_type: string;
  hs_code?: string | null;
}
const inc = (hay: string | null | undefined, needle?: string) =>
  !needle || (hay ?? "").toLowerCase().includes(needle.toLowerCase());

export function listingMatchesFilters(l: ListingLike, f: ListingFilters): boolean {
  if (!inc(l.commodity, f.commodity)) return false;
  if (!inc(l.origin_country, f.origin)) return false;
  if (!inc(l.destination_country, f.destination)) return false;
  if (f.listingType && l.listing_type !== f.listingType) return false;
  if (f.hsCode && !(l.hs_code ?? "").replace(/\D/g, "").startsWith(f.hsCode.replace(/\D/g, ""))) return false;
  return true;
}
