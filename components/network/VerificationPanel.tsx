"use client";
import { useState, useTransition } from "react";
import { requestVerification, runCompanyAdamftdCheck } from "@/lib/network/verification";
import type { VerificationKind } from "@/lib/types/network";
import type { CheckOutcome } from "@/lib/network/adamftd-check";

const KINDS: { kind: VerificationKind; label: string }[] = [
  { kind: "email", label: "Email" },
  { kind: "phone", label: "Phone" },
  { kind: "company", label: "Company" },
  { kind: "id", label: "ID" },
  { kind: "trade_reference", label: "Trade reference" },
];

export function VerificationPanel({ canRunChecks }: { canRunChecks: boolean }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function request(kind: VerificationKind) {
    setNote(null); setErr(null);
    start(async () => {
      const res = await requestVerification(kind);
      if (res.error) setErr(res.error);
      else setNote(`Verification requested: ${kind}. An admin will review it.`);
    });
  }

  function runCheck(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setOutcome(null); setErr(null);
    start(async () => {
      const res = await runCompanyAdamftdCheck({
        companyName: String(f.get("companyName") || ""),
        country: String(f.get("country") || "") || undefined,
        hsCode: String(f.get("hsCode") || "") || undefined,
      });
      if ("error" in res) setErr(res.error);
      else setOutcome(res);
    });
  }

  return (
    <div className="glass p-8 space-y-6">
      <div>
        <h2 className="serif text-white" style={{ fontSize: 22, fontWeight: 500 }}>Verification</h2>
        <p className="mt-2 text-[13px] text-gray-2">Request verification to raise your trust score and unlock the Verified Trader badge.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {KINDS.map(({ kind, label }) => (
            <button key={kind} type="button" disabled={pending} onClick={() => request(kind)} className="badge hover:text-white transition-colors">
              Request {label}
            </button>
          ))}
        </div>
        {note && <p className="mt-3 text-positive text-sm">{note}</p>}
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="serif text-white" style={{ fontSize: 18, fontWeight: 500 }}>Verify a counterparty with ADAMftd</h3>
        <form onSubmit={runCheck} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input name="companyName" placeholder="Company name" className="field" required />
          <input name="country" placeholder="Country" className="field" />
          <input name="hsCode" placeholder="HS code" className="field" />
          <div className="sm:col-span-3">
            <button type="submit" disabled={pending || !canRunChecks} className="btn-gold">
              {pending ? "Checking…" : "Run ADAMftd check"}
            </button>
            {!canRunChecks && <span className="ml-3 text-[12px] text-gray-2">Upgrade to run ADAMftd checks.</span>}
          </div>
        </form>

        {outcome && outcome.blocked && <p className="mt-3 text-negative text-sm">{outcome.reason}</p>}
        {outcome && outcome.result && (
          <div className="mt-4 card p-5">
            <div className="flex items-center justify-between">
              <span className="badge-gold uppercase">{outcome.result.status.replace("_", " ")}</span>
              <span className="mono text-[11px] text-gray-2">confidence {(outcome.result.confidenceScore * 100).toFixed(0)}%{outcome.fromCache ? " · cached" : ""}</span>
            </div>
            <p className="mt-3 text-[13px] text-gray-2">{outcome.result.resultSummary}</p>
          </div>
        )}
        {err && <p className="mt-3 text-negative text-sm">{err}</p>}
      </div>
    </div>
  );
}
