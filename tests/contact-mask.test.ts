import { describe, it, expect } from "vitest";
import { detectContactTypes, hasContactInfo, maskContactInfo } from "@/lib/network/contact-mask";

describe("detectContactTypes", () => {
  it("finds emails", () => {
    expect(detectContactTypes("write to jo@trader.co")).toContain("email");
  });
  it("finds phone numbers", () => {
    expect(detectContactTypes("call +31 6 1234 5678")).toContain("phone");
  });
  it("finds whatsapp and telegram", () => {
    expect(detectContactTypes("ping me on WhatsApp")).toContain("whatsapp");
    expect(detectContactTypes("t.me/trader99")).toContain("telegram");
  });
  it("finds urls", () => {
    expect(detectContactTypes("see www.example.com")).toContain("url");
  });
  it("clean text has none", () => {
    expect(hasContactInfo("500 MT cocoa FOB Abidjan")).toBe(false);
  });
});

describe("maskContactInfo", () => {
  it("masks an email and reports it", () => {
    const r = maskContactInfo("email me at jo@trader.co please");
    expect(r.found).toBe(true);
    expect(r.types).toContain("email");
    expect(r.masked).not.toContain("jo@trader.co");
    expect(r.masked).toContain("[contact hidden]");
  });
  it("leaves clean text unchanged", () => {
    const r = maskContactInfo("Grade I cocoa, FOB Abidjan");
    expect(r.found).toBe(false);
    expect(r.masked).toBe("Grade I cocoa, FOB Abidjan");
  });
});
