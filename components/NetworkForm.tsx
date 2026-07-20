"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const FIELD =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-cream placeholder:text-gray-2/60 focus:border-gold focus:outline-none";

export default function NetworkForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/brokerage/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data, type: "network" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong. Please try again.");
      }
      setStatus("sent");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "sent") {
    return (
      <div className="glass p-8 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-positive" />
        <h3 className="serif text-white text-xl mt-4" style={{ fontWeight: 500 }}>
          Request received.
        </h3>
        <p className="mt-2 text-[14px] text-gray-2">
          Every member is approved personally. You will hear from Giuseppe
          within a few business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass p-7 md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" required maxLength={120} placeholder="Your name *" className={FIELD} />
        <input name="company" required maxLength={160} placeholder="Company *" className={FIELD} />
        <input name="email" required type="email" maxLength={200} placeholder="Work email *" className={FIELD} />
        <input name="country" required maxLength={80} placeholder="Country *" className={FIELD} />
      </div>

      <textarea
        name="details"
        required
        maxLength={1500}
        rows={4}
        placeholder="What you trade or what you are looking for: sectors, typical volumes, whether you mainly buy, sell, or provide services. *"
        className={`${FIELD} mt-4 resize-y`}
      />

      {/* Honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {status === "error" && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button type="submit" disabled={status === "sending"} className="btn-gold mt-6 w-full justify-center disabled:opacity-60">
        {status === "sending" ? "Sending…" : "Request access"}
        <ArrowRight className="h-4 w-4" />
      </button>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-2">
        Free to join. Vetted personally. Leave with one email whenever you like.
      </p>
    </form>
  );
}
