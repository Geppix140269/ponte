"use client";
import { useState, useTransition } from "react";
import type { Plan } from "@/lib/types/network";

export function SubscribeButton({ plan, contactSales }: { plan: Plan; contactSales?: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (plan === "free") {
    return <a href="/login" className="badge px-5 py-2.5 block text-center">Create account</a>;
  }
  if (contactSales) {
    return <a href="mailto:ceo@adamftd.com?subject=ponte.trade Enterprise" className="badge-gold px-5 py-2.5 block text-center">Contact sales</a>;
  }
  return (
    <div>
      <button
        disabled={pending}
        onClick={() => start(async () => {
          setErr(null);
          const res = await fetch("/api/subscriptions/checkout", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan, interval: "month" }),
          });
          const data = await res.json().catch(() => ({}));
          if (data.url) window.location.href = data.url;
          else setErr(data.error === "price_not_configured" ? "Pricing not configured yet." : data.error ?? "Could not start checkout.");
        })}
        className="btn-gold w-full"
      >
        {pending ? "Starting…" : "Subscribe"}
      </button>
      {err && <p className="mt-2 text-negative text-[12px] text-center">{err}</p>}
    </div>
  );
}
