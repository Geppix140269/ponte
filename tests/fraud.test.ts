import { describe, it, expect } from "vitest";
import {
  normalizeCompanyName, normalizeDomain, domainFromEmail, severityForDuplicate, isFreemailDomain,
} from "@/lib/network/fraud";

describe("normalizeCompanyName", () => {
  it("strips legal suffixes and punctuation, lowercases", () => {
    expect(normalizeCompanyName("Rotterdam Commodity Partners B.V.")).toBe("rotterdam commodity partners");
    expect(normalizeCompanyName("ACME Trading, LLC")).toBe("acme trading");
    expect(normalizeCompanyName("Abidjan Cocoa Exporters SA")).toBe("abidjan cocoa exporters");
  });
  it("treats differently-formatted names as the same", () => {
    expect(normalizeCompanyName("Acme Co.")).toBe(normalizeCompanyName("ACME company"));
  });
  it("keeps a single-token name even if it is a suffix word", () => {
    expect(normalizeCompanyName("Limited")).toBe("limited");
  });
});

describe("normalizeDomain", () => {
  it("strips scheme, www, and path", () => {
    expect(normalizeDomain("https://www.Example.com/path?x=1")).toBe("example.com");
    expect(normalizeDomain("Example.com")).toBe("example.com");
  });
});

describe("domainFromEmail", () => {
  it("extracts and normalizes the domain", () => {
    expect(domainFromEmail("jo@Trader.co")).toBe("trader.co");
    expect(domainFromEmail("not-an-email")).toBeNull();
  });
});

describe("severity + freemail", () => {
  it("domain duplicates are higher severity than name", () => {
    expect(severityForDuplicate("domain")).toBe("high");
    expect(severityForDuplicate("name")).toBe("medium");
  });
  it("flags freemail domains", () => {
    expect(isFreemailDomain("gmail.com")).toBe(true);
    expect(isFreemailDomain("rcp.example")).toBe(false);
  });
});
