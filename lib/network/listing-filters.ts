// Pure parsing/validation of listing search filters (from URL query params).
import type { ListingType } from "@/lib/types/network";

export interface ListingFilters {
  commodity?: string;
  origin?: string;
  destination?: string;
  listingType?: ListingType;
  hsCode?: string;
  company?: string;
  minTrustScore?: number;
  verifiedOnly?: boolean;
}

const clean = (v?: string) => {
  const t = (v ?? "").trim();
  return t.length ? t : undefined;
};

export function parseListingFilters(raw: Record<string, string | undefined>): ListingFilters {
  const f: ListingFilters = {
    commodity: clean(raw.commodity),
    origin: clean(raw.origin),
    destination: clean(raw.destination),
    hsCode: clean(raw.hsCode),
    company: clean(raw.company),
  };
  const t = clean(raw.listingType);
  if (t === "offer" || t === "request") f.listingType = t;
  const min = Number(raw.minTrustScore);
  if (Number.isFinite(min) && min > 0) f.minTrustScore = Math.max(0, Math.min(100, Math.round(min)));
  if (raw.verifiedOnly === "true" || raw.verifiedOnly === "1") f.verifiedOnly = true;
  return f;
}

export function hasAnyFilter(f: ListingFilters): boolean {
  return Object.values(f).some((v) => v !== undefined);
}
