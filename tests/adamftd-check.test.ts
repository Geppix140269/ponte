import { describe, it, expect, vi } from "vitest";
import { runCounterpartyCheck, currentPeriod, type CheckDeps } from "@/lib/network/adamftd-check";
import { MockVerificationProvider } from "@/lib/verification/mock-provider";
import type { Principal } from "@/lib/rbac";

const provider = new MockVerificationProvider();
const proUser: Principal = { id: "u1", role: "customer", account_type: "trader", plan: "pro", plan_status: "active" };
const freeUser: Principal = { id: "u2", role: "customer", account_type: "buyer", plan: "free", plan_status: "inactive" };

function deps(over: Partial<CheckDeps> = {}): CheckDeps {
  return {
    getCachedCheck: async () => null,
    getMonthlyUsage: async () => 0,
    saveCheck: async () => ({ checkId: "chk_1" }),
    incrementUsage: async () => {},
    provider,
    ...over,
  };
}

describe("runCounterpartyCheck", () => {
  it("returns a cached result without spending quota or calling the provider", async () => {
    const save = vi.fn(async () => ({ checkId: "x" }));
    const inc = vi.fn(async () => {});
    const spy = vi.spyOn(provider, "verifyCounterparty");
    const out = await runCounterpartyCheck(proUser, { companyName: "Cached Co" }, deps({
      getCachedCheck: async () => ({ result: { status: "match" } as any, checkId: "cached_1" }),
      saveCheck: save, incrementUsage: inc,
    }));
    expect(out.fromCache).toBe(true);
    expect(out.checkId).toBe("cached_1");
    expect(save).not.toHaveBeenCalled();
    expect(inc).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("blocks a free user (no ADAMftd allowance) and does not call the provider", async () => {
    const spy = vi.spyOn(provider, "verifyCounterparty");
    const out = await runCounterpartyCheck(freeUser, { companyName: "Acme" }, deps());
    expect(out.ok).toBe(false);
    expect(out.blocked).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("blocks a pro user who has hit the monthly cap", async () => {
    const out = await runCounterpartyCheck(proUser, { companyName: "Acme" }, deps({
      getMonthlyUsage: async () => 10, // pro limit is 10
    }));
    expect(out.blocked).toBe(true);
  });

  it("runs the provider, persists, and increments usage on a fresh allowed check", async () => {
    const save = vi.fn(async () => ({ checkId: "chk_new" }));
    const inc = vi.fn(async () => {});
    const out = await runCounterpartyCheck(
      proUser,
      { companyName: "Rotterdam Commodity Partners BV", country: "Netherlands", hsCode: "0901.11" },
      deps({ saveCheck: save, incrementUsage: inc }),
    );
    expect(out.ok).toBe(true);
    expect(out.fromCache).toBe(false);
    expect(out.result?.status).toBe("match");
    expect(save).toHaveBeenCalledOnce();
    expect(inc).toHaveBeenCalledWith("u1", currentPeriod());
  });
});

describe("currentPeriod", () => {
  it("formats YYYY-MM in UTC", () => {
    expect(currentPeriod(new Date("2026-03-09T00:00:00Z"))).toBe("2026-03");
  });
});
