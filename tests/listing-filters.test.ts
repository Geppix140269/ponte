import { describe, it, expect } from "vitest";
import { parseListingFilters, hasAnyFilter } from "@/lib/network/listing-filters";

describe("parseListingFilters", () => {
  it("trims and drops empty values", () => {
    const f = parseListingFilters({ commodity: "  Cocoa ", origin: "", destination: undefined });
    expect(f.commodity).toBe("Cocoa");
    expect(f.origin).toBeUndefined();
    expect(hasAnyFilter(f)).toBe(true);
  });
  it("validates listing type", () => {
    expect(parseListingFilters({ listingType: "offer" }).listingType).toBe("offer");
    expect(parseListingFilters({ listingType: "garbage" }).listingType).toBeUndefined();
  });
  it("clamps trust score 0..100", () => {
    expect(parseListingFilters({ minTrustScore: "150" }).minTrustScore).toBe(100);
    expect(parseListingFilters({ minTrustScore: "-5" }).minTrustScore).toBeUndefined();
  });
  it("parses verifiedOnly flag", () => {
    expect(parseListingFilters({ verifiedOnly: "true" }).verifiedOnly).toBe(true);
    expect(parseListingFilters({ verifiedOnly: "no" }).verifiedOnly).toBeUndefined();
  });
  it("empty params yield no filters", () => {
    expect(hasAnyFilter(parseListingFilters({}))).toBe(false);
  });
});
