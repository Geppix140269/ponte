import { describe, it, expect } from "vitest";
import { computeContactUnlocked, renderMessageBody, acceptanceColumnFor } from "@/lib/network/contact-gate";

describe("computeContactUnlocked", () => {
  it("requires both parties", () => {
    expect(computeContactUnlocked(true, true)).toBe(true);
    expect(computeContactUnlocked(true, false)).toBe(false);
    expect(computeContactUnlocked(false, false)).toBe(false);
  });
});

describe("renderMessageBody", () => {
  it("masks contact details while locked", () => {
    const out = renderMessageBody("call me at +31 6 1234 5678", false);
    expect(out).not.toContain("1234 5678");
    expect(out).toContain("[contact hidden]");
  });
  it("shows verbatim once unlocked", () => {
    const body = "email jo@trader.co";
    expect(renderMessageBody(body, true)).toBe(body);
  });
  it("leaves clean messages untouched", () => {
    expect(renderMessageBody("Can you do CIF Hamburg?", false)).toBe("Can you do CIF Hamburg?");
  });
});

describe("acceptanceColumnFor", () => {
  it("maps role to column", () => {
    expect(acceptanceColumnFor("initiator")).toBe("initiator_accepted_contact");
    expect(acceptanceColumnFor("counterparty")).toBe("counterparty_accepted_contact");
  });
});
