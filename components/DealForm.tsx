"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type DealType = "offer" | "requirement";

const FIELD =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-cream placeholder:text-gray-2/60 focus:border-gold focus:outline-none";

export default function DealForm() {
  const [type, setType] = useState<DealType>("offer");
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
        body: JSON.stringify({ ...data, type }),
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
          Received.
        </h3>
        <p className="mt-2 text-[14px] text-gray-2">
          We reply within two business days. If the deal is workable, the next
          step is paperwork, not a pitch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass p-7 md:p-8">
      {/* Offer / Requirement toggle */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg border border-white/10 p-1">
        {(["offer", "requirement"] as DealType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-md py-2.5 text-[11px] uppercase transition-colors ${
              type === t ? "bg-gold text-navy font-bold" : "text-gray-2 hover:text-cream"
            }`}
            style={{ letterSpacing: "0.16em" }}
          >
            {t === "offer" ? "I have an offer" : "I have a requirement"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" required maxLength={120} placeholder="Your name *" className={FIELD} />
        <input name="company" required maxLength={160} placeholder="Company *" className={FIELD} />
        <input name="email" required type="email" maxLength={200} placeholder="Work email *" className={FIELD} />
        <input name="country" required maxLength={80} placeholder="Country *" className={FIELD} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <input
          name="product"
          required
          maxLength={200}
          placeholder={type === "offer" ? "Product on offer (HS code if known) *" : "Product required (HS code if known) *"}
          className={FIELD}
        />
        <input name="volume" maxLength={120} placeholder="Volume / quantity" className={FIELD} />
      </div>

      <textarea
        name="details"
        required
        maxLength={2000}
        rows={5}
        placeholder={
          type === "offer"
            ? "The essentials: origin, specs, price indication, incoterm, timing, and anything a serious buyer will ask first. *"
            : "The essentials: destination, specs, target price, incoterm, timing, and anything a serious seller will ask first. *"
        }
        className={`${FIELD} mt-4 resize-y`}
      />

      {/* Honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {status === "error" && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}

      <button type="submit" disabled={status === "sending"} className="btn-gold mt-6 w-full justify-center disabled:opacity-60">
        {status === "sending" ? "Sending…" : type === "offer" ? "Submit the offer" : "Submit the requirement"}
        <ArrowRight className="h-4 w-4" />
      </button>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-2">
        Treated in confidence. Nothing is circulated without your agreement,
        and introductions happen only under signed NCNDA and fee terms.
      </p>
    </form>
  );
}
