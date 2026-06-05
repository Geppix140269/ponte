// Multi-filter listing search. Runs server-side with the service role but is
// explicitly constrained to publicly visible listings (active + approved), so
// it never leaks drafts or flagged/rejected items.
import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { ListingFilters } from "@/lib/network/listing-filters";
import type { Listing } from "@/lib/types/network";

export interface ListingOwner {
  id: string;
  full_name: string | null;
  company: string | null;
  country: string | null;
  trust_score: number;
  verification_level: string;
  verified_trader: boolean;
}

export type ListingWithOwner = Listing & { owner: ListingOwner | null };

export async function searchListings(
  filters: ListingFilters, opts: { limit?: number } = {},
): Promise<ListingWithOwner[]> {
  const sb = createAdminClient();
  const limit = opts.limit ?? 50;

  // Profile-level filters (trust score, verified, company) resolve to a set of
  // owner ids first. This avoids fragile embedded-resource filtering.
  let ownerIds: string[] | null = null;
  if (filters.minTrustScore || filters.verifiedOnly || filters.company) {
    let pq = sb.from("profiles").select("id");
    if (filters.minTrustScore) pq = pq.gte("trust_score", filters.minTrustScore);
    if (filters.verifiedOnly) pq = pq.eq("verified_trader", true);
    if (filters.company) pq = pq.ilike("company", `%${filters.company}%`);
    const { data } = await pq;
    ownerIds = (data ?? []).map((r: { id: string }) => r.id);
    if (ownerIds.length === 0) return [];
  }

  let q = sb.from("listings").select("*")
    .eq("status", "active").eq("moderation_status", "approved")
    .order("created_at", { ascending: false }).limit(limit);

  if (ownerIds) q = q.in("owner_id", ownerIds);
  if (filters.commodity) q = q.ilike("commodity", `%${filters.commodity}%`);
  if (filters.origin) q = q.ilike("origin_country", `%${filters.origin}%`);
  if (filters.destination) q = q.ilike("destination_country", `%${filters.destination}%`);
  if (filters.hsCode) q = q.ilike("hs_code", `${filters.hsCode}%`);
  if (filters.listingType) q = q.eq("listing_type", filters.listingType);

  const { data: listings } = await q;
  const rows = (listings ?? []) as Listing[];
  if (rows.length === 0) return [];

  // Attach a compact owner summary for the cards.
  const ids = Array.from(new Set(rows.map((l) => l.owner_id)));
  const { data: owners } = await sb.from("profiles")
    .select("id, full_name, company, country, trust_score, verification_level, verified_trader")
    .in("id", ids);
  const byId = new Map<string, ListingOwner>();
  for (const o of (owners ?? []) as ListingOwner[]) byId.set(o.id, o);

  return rows.map((l) => ({ ...l, owner: byId.get(l.owner_id) ?? null }));
}

// Single listing for the detail page (public visibility enforced for non-owners
// happens in the page via RLS read; this helper is for the public view).
export async function getListing(id: string): Promise<ListingWithOwner | null> {
  const sb = createAdminClient();
  const { data } = await sb.from("listings").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const listing = data as Listing;
  const { data: owner } = await sb.from("profiles")
    .select("id, full_name, company, country, trust_score, verification_level, verified_trader")
    .eq("id", listing.owner_id).maybeSingle();
  return { ...listing, owner: (owner as ListingOwner) ?? null };
}
