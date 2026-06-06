import { describe, it, expect } from "vitest";
import {
  buildMilestonePlan, canReleaseMilestone, feeCents, planTotals, DEFAULT_SCHEDULE,
} from "@/lib/settlement/plan";

describe("buildMilestonePlan", () => {
  it("splits the default 20/60/20 ladder and sums exactly to the total", () => {
    const ms = buildMilestonePlan(1_425_000_00);
    expect(ms.map((m) => m.amountCents)).toEqual([285_000_00, 855_000_00, 285_000_00]);
    expect(ms.reduce((s, m) => s + m.amountCents, 0)).toBe(1_425_000_00);
    expect(ms[1].requiredDocType).toBe("bill_of_lading");
  });
  it("puts the rounding remainder on the last milestone", () => {
    const total = 100_00 + 1;
    const ms = buildMilestonePlan(total, [
      { label: "a", pct: 33.34, trigger: "deposit" },
      { label: "b", pct: 33.33, trigger: "shipment" },
      { label: "c", pct: 33.33, trigger: "arrival" },
    ]);
    expect(ms.reduce((s, m) => s + m.amountCents, 0)).toBe(total);
  });
  it("rejects schedules that do not sum to 100", () => {
    expect(() => buildMilestonePlan(1000, [{ label: "x", pct: 90, trigger: "deposit" }])).toThrow();
  });
  it("rejects non-positive totals", () => { expect(() => buildMilestonePlan(0)).toThrow(); });
});
describe("canReleaseMilestone", () => {
  const ms = buildMilestonePlan(1_000_00);
  it("deposit needs no document", () => { expect(canReleaseMilestone(ms[0], [])).toBe(true); });
  it("shipment needs a verified bill of lading", () => {
    expect(canReleaseMilestone(ms[1], [])).toBe(false);
    expect(canReleaseMilestone(ms[1], ["bill_of_lading"])).toBe(true);
  });
  it("arrival needs an inspection certificate", () => {
    expect(canReleaseMilestone(ms[2], ["inspection_certificate"])).toBe(true);
  });
});
describe("feeCents + planTotals", () => {
  it("computes the bps fee", () => { expect(feeCents(1_425_000_00, 60)).toBe(8_550_00); });
  it("tracks held vs released", () => {
    const ms = buildMilestonePlan(1_000_00); ms[0].status = "released";
    const t = planTotals(ms);
    expect(t.released).toBe(200_00); expect(t.held).toBe(800_00);
    expect(DEFAULT_SCHEDULE.length).toBe(3);
  });
});
