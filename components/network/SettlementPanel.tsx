"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock } from "lucide-react";
import { createSettlement, fundSettlement, releaseSettlementMilestone, type DealSettlement } from "@/lib/network/settlement-actions";

const money = (cents: number, ccy: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD", maximumFractionDigits: 0 }).format(cents / 100);

const MS_TONE: Record<string, string> = {
  released: "text-positive", funded: "text-gold", ready: "text-gold", pending: "text-gray-2", refunded: "text-negative", disputed: "text-negative",
};
const MS_LABEL: Record<string, string> = {
  released: "Released", funded: "In escrow", ready: "Ready", pending: "Pending", refunded: "Refunded", disputed: "Disputed",
};

export function SettlementPanel({ dealId, settlement }: { dealId: string; settlement: DealSettlement | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => { const r = await fn(); if (r.error) setErr(r.error); else { setErr(null); router.refresh(); } });

  return (
    <div className="glass p-5">
      <p className="mono text-[10px] text-gray-2 uppercase mb-3 inline-flex items-center gap-1.5" style={{ letterSpacing: "0.18em" }}>
        <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Secured by ponte
      </p>

      {!settlement && (
        <div>
          <p className="text-[12px] text-gray-2 mb-3">Hold funds in escrow and release them as shipment milestones are met.</p>
          <div className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Deal value (USD)" className="field" inputMode="decimal" />
            <button disabled={pending} className="btn-gold whitespace-nowrap"
              onClick={() => { const v = Math.round(Number(amount) * 100); if (v > 0) run(() => createSettlement(dealId, v)); }}>
              Secure deal
            </button>
          </div>
        </div>
      )}

      {settlement && (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div><div className="text-[11px] text-gray-2">In escrow</div><div className="font-medium">{money(settlement.heldCents, settlement.currency)}</div></div>
            <div><div className="text-[11px] text-gray-2">Released</div><div className="font-medium text-positive">{money(settlement.releasedCents, settlement.currency)}</div></div>
            <div><div className="text-[11px] text-gray-2">Fee · 0.6%</div><div className="font-medium">{money(settlement.feeCents, settlement.currency)}</div></div>
          </div>

          {settlement.status === "draft" && (
            <button disabled={pending} className="btn-gold w-full mb-3" onClick={() => run(() => fundSettlement(settlement.id))}>
              Fund escrow · {money(settlement.totalCents, settlement.currency)}
            </button>
          )}

          <ul className="divide-y divide-rule">
            {settlement.milestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{m.label}</p>
                  <p className="text-[11px] text-gray-2 inline-flex items-center gap-1">
                    {m.requiredDocType ? <><Lock className="h-3 w-3" /> {m.requiredDocType.replace(/_/g, " ")}</> : "no document"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-medium">{money(m.amountCents, settlement.currency)}</div>
                  <div className={`text-[11px] ${MS_TONE[m.status] ?? "text-gray-2"}`}>{MS_LABEL[m.status] ?? m.status}</div>
                </div>
                {m.status === "funded" && (
                  <button disabled={pending} className="badge-gold whitespace-nowrap" onClick={() => run(() => releaseSettlementMilestone(m.id))}>Release</button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-gray-2 inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Mock escrow. Funds held by a regulated partner once live.</p>
        </div>
      )}
      {err && <p className="mt-2 text-negative text-[12px]">{err}</p>}
    </div>
  );
}
