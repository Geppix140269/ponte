import type { SettlementProvider } from "./types";
import { MockSettlementProvider } from "./mock-provider";
import { LiveSettlementProvider } from "./live-provider";
let cached: SettlementProvider | null = null;
export function getSettlementProvider(): SettlementProvider {
  if (cached) return cached;
  cached = process.env.SETTLEMENT_LIVE === "true" ? new LiveSettlementProvider() : new MockSettlementProvider();
  return cached;
}
export function __resetSettlementProvider() { cached = null; }
export * from "./types";
export { buildMilestonePlan, canReleaseMilestone, feeCents, planTotals, DEFAULT_SCHEDULE } from "./plan";
