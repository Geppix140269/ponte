"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOwnProfile } from "@/lib/network/profile-actions";
import type { NetworkProfile } from "@/lib/types/network";

const ROLES = [
  { v: "buyer", label: "Buyer", hint: "I source and buy commodities" },
  { v: "seller", label: "Seller", hint: "I produce or sell commodities" },
  { v: "trader", label: "Trader", hint: "I buy and sell (trading house)" },
  { v: "enterprise", label: "Enterprise", hint: "Multi-seat trading desk" },
] as const;

export function OnboardingForm({ profile }: { profile: NetworkProfile }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [role, setRole] = useState<NetworkProfile["account_type"]>(profile.account_type ?? null);
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!role) { setErr("Choose how you trade."); return; }
    setErr(null);
    start(async () => {
      const res = await updateOwnProfile({
        account_type: role,
        full_name: String(f.get("full_name") || "") || undefined,
        company: String(f.get("company") || "") || undefined,
        country: String(f.get("country") || "") || undefined,
      });
      if (res.error) setErr(res.error);
      else router.push(role === "buyer" ? "/network/discover" : "/network/profile/edit");
    });
  }

  return (
    <form onSubmit={submit} className="glass p-8 space-y-6 max-w-2xl">
      <div>
        <p className="mono text-[10px] text-gray-2 uppercase mb-3" style={{ letterSpacing: "0.18em" }}>How do you trade?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => (
            <button type="button" key={r.v} onClick={() => setRole(r.v)}
              className={`card p-4 text-left ${role === r.v ? "ring-1 ring-gold" : ""}`}>
              <p className="font-medium text-ink">{r.label}</p>
              <p className="text-[12px] text-gray-2">{r.hint}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="full_name" label="Your name" def={profile.full_name ?? ""} />
        <Field name="company" label="Company" def={profile.company ?? ""} />
        <Field name="country" label="Country" def={profile.country ?? ""} />
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn-gold">{pending ? "Saving…" : "Continue"}</button>
        <a href="/network/discover" className="text-[13px] text-gray-2 hover:text-gold">Skip for now</a>
        {err && <span className="text-negative text-sm">{err}</span>}
      </div>
    </form>
  );
}
function Field({ name, label, def }: { name: string; label: string; def: string }) {
  return (
    <div>
      <label className="mono text-[10px] text-gray-2 uppercase block mb-1.5" style={{ letterSpacing: "0.18em" }}>{label}</label>
      <input name={name} defaultValue={def} className="field" />
    </div>
  );
}
