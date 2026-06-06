"use client";
import { useState, useTransition } from "react";

export function ManageBillingButton() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button disabled={pending} className="btn-gold"
        onClick={() => start(async () => {
          setErr(null);
          const res = await fetch("/api/subscriptions/portal", { method: "POST" });
          const data = await res.json().catch(() => ({}));
          if (data.url) window.location.href = data.url;
          else setErr(data.error === "no_customer" ? "No billing account yet. Subscribe first." : "Billing portal unavailable.");
        })}>
        {pending ? "Opening…" : "Manage billing"}
      </button>
      {err && <span className="ml-3 text-negative text-[12px]">{err}</span>}
    </>
  );
}
