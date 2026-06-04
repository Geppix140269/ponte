"use client";
import { useState, useTransition } from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import { runCompanyAdamftdCheck } from "@/lib/network/verification";
import type { CheckOutcome } from "@/lib/network/adamftd-check";

const SIGNAL_LABEL: Record<string, string> = {
  sanctions_clear: "Sanctions clear",
  company_registered: "Company registered",
  trade_activity_exists: "Trade activity exists",
  commodity_matches: "Commodity matches",
  country_matches: "Country matches",
  counterparty_plausible: "Counterparty plausible",
};

export function VerifyWidget({ canRun }: { canRun: boolean }) {
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="glass p-8">
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setErr(null); setOutcome(null);
          start(async () => {
            const res = await runCompanyAdamftdCheck({
              companyName: String(f.get("companyName") || ""),
              country: String(f.get("country") || "") || undefined,
              hsCode: String(f.get("hsCode") || "") || undefined,
            });
            if ("error" in res) setErr(res.error);
            else setOutcome(res);
          });
        }}
      >
        <input name="companyName" placeholder="Company name" className="field" required />
        <input name="country" placeholder="Country" className="field" />
        <input name="hsCode" placeholder="HS code" className="field" />
        <div className="sm:col-span-3">
          <button type="submit" disabled={pending || !canRun} className="btn-gold">{pending ? "Checking…" : "Verify with ADAMftd"}</button>
          {!canRun && <span className="ml-3 text-[12px] text-gray-2">Upgrade to Starter or above to run checks.</span>}
        </div>
      </form>

      {err && <p className="mt-4 text-negative text-sm">{err}</p>}
      {outcome?.blocked && <p className="mt-4 text-negative text-sm">{outcome.reason}</p>}

      {outcome?.result && (
        <div className="mt-6 card p-6">
          <div className="flex items-center justify-between">
            <span className="badge-gold uppercase">{outcome.result.status.replace(/_/g, " ")}</span>
            <span className="mono text-[11px] text-gray-2">
              confidence {(outcome.result.confidenceScore * 100).toFixed(0)}%{outcome.fromCache ? " · cached" : ""} · {outcome.result.source}
            </span>
          </div>
          <p className="mt-3 text-[14px] text-gray-2">{outcome.result.resultSummary}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {Object.entries(outcome.result.signals).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-[13px]">
                {v ? <Check className="h-4 w-4 text-positive" /> : <X className="h-4 w-4 text-negative" />}
                <span className="text-gray-2">{SIGNAL_LABEL[k] ?? k}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 inline-flex items-center gap-2 text-[11px] text-gray-2">
            <AlertTriangle className="h-3.5 w-3.5 text-gold" />
            Grounded intelligence signals, not a certification of legitimacy. Verify against original sources for contractual decisions.
          </p>
        </div>
      )}
    </div>
  );
}
