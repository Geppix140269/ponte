import { describe, it, expect } from "vitest";
import { listingMatchesFilters } from "@/lib/network/listing-match";

const listing = { commodity: "Cocoa Beans", origin_country: "Côte d'Ivoire", destination_country: "Netherlands", listing_type: "offer", hs_code: "1801.00" };

describe("listingMatchesFilters", () => {
  it("matches on commodity substring (case-insensitive)", () => {
    expect(listingMatchesFilters(listing, { role: undefined as any, commodity: "cocoa" } as any)).toBe(true);
  });
  it("matches origin + type", () => {
    expect(listingMatchesFilters(listing, { origin: "Côte", listingType: "offer" } as any)).toBe(true);
  });
  it("fails on wrong type", () => {
    expect(listingMatchesFilters(listing, { listingType: "request" } as any)).toBe(false);
  });
  it("matches HS prefix ignoring punctuation", () => {
    expect(listingMatchesFilters(listing, { hsCode: "1801" } as any)).toBe(true);
    expect(listingMatchesFilters(listing, { hsCode: "0901" } as any)).toBe(false);
  });
  it("empty filters match anything", () => {
    expect(listingMatchesFilters(listing, {} as any)).toBe(true);
  });
});
