import { describe, it, expect } from "vitest";
import { moderateText, moderateListing } from "@/lib/network/moderation";

describe("moderateText", () => {
  it("approves clean listings", () => {
    const r = moderateText("500 MT Grade I cocoa beans, FOB Abidjan, 2025/26 main crop.");
    expect(r.status).toBe("approved");
    expect(r.matched).toHaveLength(0);
  });
  it("rejects advance-fee scam patterns", () => {
    expect(moderateText("Send proof of funds first then we talk").status).toBe("rejected");
    expect(moderateText("We are a direct seller mandate for the refinery").status).toBe("rejected");
  });
  it("flags vague scam phrasing for review", () => {
    const r = moderateText("Serious buyers only. Allocation available now.");
    expect(r.status).toBe("flagged");
    expect(r.matched).toContain("serious buyers only");
    expect(r.matched).toContain("allocation available");
  });
  it("flags off-platform contact solicitation", () => {
    expect(moderateText("contact me on whatsapp").status).toBe("flagged");
    expect(moderateText("reach us on Telegram").status).toBe("flagged");
  });
  it("reject takes precedence over flag", () => {
    expect(moderateText("Serious buyers only, proof of funds first").status).toBe("rejected");
  });
  it("is case-insensitive", () => {
    expect(moderateText("GOLD AVAILABLE").status).toBe("flagged");
  });
});

describe("moderateListing", () => {
  it("scans commodity + specifications together", () => {
    const r = moderateListing({ commodity: "Gold available", specifications: "clean spec" });
    expect(r.status).toBe("flagged");
  });
});
