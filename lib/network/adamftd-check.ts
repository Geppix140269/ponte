// Orchestrates an ADAMftd counterparty check with cost controls:
//   1. shared cache lookup (a counterparty verified once is reused, never re-billed)
//   2. monthly per-plan limit check
//   3. provider call (mock until ADAMFTD_LIVE=true)
//   4. persist result + increment usage
//
// All side effects go through the injected CheckDeps, so this is fully
// unit-testable without a database or network.

import { getVerificationProvider } from "@/lib/verification";
import { cacheKey } from "@/lib/verification/compose";
import { canRunAdamftdCheck, type Principal } from "@/lib/rbac";
import type {
  CounterpartyQuery, VerificationResult, VerificationProvider,
} from "@/lib/verification/types";

export interface SaveCheckInput {
  cacheKey: string;
  query: CounterpartyQuery;
  result: VerificationResult;
  requesterId: string;
}

export interface CheckDeps {
  getCachedCheck(key: string): Promise<{ result: VerificationResult; checkId: string } | null>;
  getMonthlyUsage(profileId: string, period: string): Promise<number>;
  saveCheck(input: SaveCheckInput): Promise<{ checkId: string }>;
  incrementUsage(profileId: string, period: string): Promise<void>;
  provider?: VerificationProvider; // defaults to getVerificationProvider()
  now?: () => Date;
}

export interface CheckOutcome {
  ok: boolean;
  fromCache: boolean;
  blocked?: boolean;
  reason?: string;
  result?: VerificationResult;
  checkId?: string;
}

// Calendar month bucket "YYYY-MM" for usage metering.
export function currentPeriod(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function runCounterpartyCheck(
  principal: Principal,
  query: CounterpartyQuery,
  deps: CheckDeps,
): Promise<CheckOutcome> {
  const key = cacheKey(query.companyName, query.country);

  // 1. Cache: free, no quota consumed, no provider call.
  const cached = await deps.getCachedCheck(key);
  if (cached) {
    return { ok: true, fromCache: true, result: cached.result, checkId: cached.checkId };
  }

  // 2. Monthly limit.
  const period = currentPeriod(deps.now?.() ?? new Date());
  const used = await deps.getMonthlyUsage(principal.id, period);
  const decision = canRunAdamftdCheck(principal, used);
  if (!decision.allowed) {
    return { ok: false, blocked: true, fromCache: false, reason: decision.reason };
  }

  // 3. Provider call (mock unless ADAMFTD_LIVE=true).
  const provider = deps.provider ?? getVerificationProvider();
  const result = await provider.verifyCounterparty(query);

  // 4. Persist + meter.
  const { checkId } = await deps.saveCheck({ cacheKey: key, query, result, requesterId: principal.id });
  await deps.incrementUsage(principal.id, period);

  return { ok: true, fromCache: false, result, checkId };
}
