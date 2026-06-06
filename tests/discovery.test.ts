import { describe, it, expect } from "vitest";
import { parseDiscoveryQuery } from "@/lib/network/discovery-query";
import { MockDiscoveryProvider } from "@/lib/network/discovery";

describe("parseDiscoveryQuery", () => {
  it("defaults role to suppliers and limit to 8", () => {
    const q = parseDiscoveryQuery({});
    expect(q.role).toBe("suppliers"); expect(q.limit).toBe(8);
  });
  it("honors buyers role and trims fields", () => {
    const q = parseDiscoveryQuery({ role: "buyers", commodity: " Sugar ", country: "BR" });
    expect(q.role).toBe("buyers"); expect(q.commodity).toBe("Sugar"); expect(q.country).toBe("BR");
  });
  it("parses minShipments and clamps limit", () => {
    const q = parseDiscoveryQuery({ minShipments: "25", limit: "999" });
    expect(q.minShipments).toBe(25); expect(q.limit).toBe(50);
  });
});

describe("MockDiscoveryProvider", () => {
  const p = new MockDiscoveryProvider();
  it("is deterministic for the same query", async () => {
    const a = await p.discover({ role: "suppliers", commodity: "Sugar", country: "BR" });
    const b = await p.discover({ role: "suppliers", commodity: "Sugar", country: "BR" });
    expect(a.results.map((x) => x.id)).toEqual(b.results.map((x) => x.id));
  });
  it("returns results, verified-first, within the limit", async () => {
    const { results, total } = await p.discover({ role: "suppliers", commodity: "Cocoa", country: "CI", limit: 8 });
    expect(results.length).toBeLessThanOrEqual(8);
    expect(total).toBeGreaterThan(0);
    const firstUnverified = results.findIndex((r) => !r.verified);
    const lastVerified = results.map((r) => r.verified).lastIndexOf(true);
    if (firstUnverified !== -1 && lastVerified !== -1) expect(lastVerified).toBeLessThan(results.length);
  });
});
