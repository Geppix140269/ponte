import { describe, it, expect } from "vitest";
import { EVENT, ALL_EVENTS, isKnownEvent } from "@/lib/analytics/events";

describe("analytics event taxonomy", () => {
  it("exposes the core funnel events", () => {
    for (const e of ["verify_run","listing_published","deal_opened","message_sent","settlement_released","subscribe_started"]) {
      expect(ALL_EVENTS).toContain(e);
    }
  });
  it("isKnownEvent guards unknowns", () => {
    expect(isKnownEvent(EVENT.verify_run)).toBe(true);
    expect(isKnownEvent("totally_made_up")).toBe(false);
  });
  it("names are unique", () => {
    expect(new Set(ALL_EVENTS).size).toBe(ALL_EVENTS.length);
  });
});
