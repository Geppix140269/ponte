// Pure milestone-plan math. No I/O — fully unit-testable.
import type { MilestoneSpec, Milestone } from "./types";

export const DEFAULT_SCHEDULE: MilestoneSpec[] = [
  { label: "Deposit on agreement", pct: 20, trigger: "deposit" },
  { label: "On shipment",          pct: 60, trigger: "shipment", requiredDocType: "bill_of_lading" },
  { label: "On arrival",           pct: 20, trigger: "arrival",  requiredDocType: "inspection_certificate" },
];

export function feeCents(totalCents: number, feeBps: number): number {
  return Math.round((totalCents * feeBps) / 10000);
}
export function buildMilestonePlan(totalCents: number, schedule: MilestoneSpec[] = DEFAULT_SCHEDULE): Milestone[] {
  if (totalCents <= 0) throw new Error("total must be positive");
  const sum = schedule.reduce((s, m) => s + m.pct, 0);
  if (Math.round(sum) !== 100) throw new Error(`schedule percentages must sum to 100 (got ${sum})`);
  let allocated = 0;
  return schedule.map((m, i) => {
    const last = i === schedule.length - 1;
    const amountCents = last ? totalCents - allocated : Math.round((totalCents * m.pct) / 100);
    allocated += amountCents;
    return { ...m, seq: i + 1, amountCents, status: "pending" as const };
  });
}
export function canReleaseMilestone(m: Milestone, verifiedDocTypes: string[]): boolean {
  if (m.trigger === "deposit" || !m.requiredDocType) return true;
  return verifiedDocTypes.includes(m.requiredDocType);
}
export function planTotals(milestones: Milestone[]): { total: number; released: number; held: number } {
  const total = milestones.reduce((s, m) => s + m.amountCents, 0);
  const released = milestones.filter((m) => m.status === "released").reduce((s, m) => s + m.amountCents, 0);
  return { total, released, held: total - released };
}
