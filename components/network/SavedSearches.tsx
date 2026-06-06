"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, X } from "lucide-react";
import { saveSearch, deleteSavedSearch, type SavedSearchRow } from "@/lib/network/saved-search-actions";
import type { ListingFilters } from "@/lib/network/listing-filters";

function toQuery(f: ListingFilters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== "") p.set(k, String(v));
  return p.toString();
}
function describe(f: ListingFilters): string {
  return [f.commodity, f.origin, f.destination, f.listingType, f.hsCode, f.company, f.verifiedOnly ? "verified" : null]
    .filter(Boolean).join(" · ") || "All listings";
}

export function SavedSearches({ current, saved }: { current: ListingFilters; saved: SavedSearchRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const hasCurrent = Object.values(current).some((v) => v !== undefined);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {hasCurrent && (
        <button disabled={pending} onClick={() => start(() => saveSearch(describe(current), current).then(() => router.refresh()))}
          className="badge-gold inline-flex items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5" /> Save this search
        </button>
      )}
      {saved.map((s) => (
        <span key={s.id} className="badge inline-flex items-center gap-1.5">
          <button onClick={() => router.push(`/network/listings?${toQuery(s.filters)}`)} className="hover:text-gold">{s.name}</button>
          <button aria-label="Delete" disabled={pending} onClick={() => start(() => deleteSavedSearch(s.id).then(() => router.refresh()))} className="text-gray-2 hover:text-negative"><X className="h-3 w-3" /></button>
        </span>
      ))}
    </div>
  );
}
