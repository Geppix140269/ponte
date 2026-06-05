import { describe, it, expect } from "vitest";
import { sanctionMatchStatus } from "@/lib/verification/live-provider";

describe("sanctionMatchStatus (fuzzy-search hardening)", () => {
  it("no candidates -> clear", () => {
    expect(sanctionMatchStatus("Anyone", []).status).toBe("clear");
  });
  it("strong multi-token match -> hit (Cytrox)", () => {
    const r = sanctionMatchStatus("Cytrox Holdings", [
      "Cytrox Holdings Zrt.",
      "Cytrox Holdings Zartkoruen Mukodo Reszvenytarsasag",
    ]);
    expect(r.status).toBe("hit");
  });
  it("tangential fuzzy candidate for a clean name -> clear (Adidas)", () => {
    const r = sanctionMatchStatus("Adidas", ["Some Unrelated Sanctioned Trading Company"]);
    expect(r.status).toBe("clear");
  });
  it("moderate overlap -> manual review, not an auto-block", () => {
    const r = sanctionMatchStatus("Acme Global Traders", ["Acme Global Holdings"]);
    expect(r.status).toBe("partial");
  });
  it("exact single-distinctive-token strong match still hits", () => {
    const r = sanctionMatchStatus("Cytrox Holdings", ["Cytrox Holdings"]);
    expect(r.status).toBe("hit");
  });
});
