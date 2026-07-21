"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function InterestButton({ refCode }: { refCode: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function express() {
    setStatus("sending");
    try {
      const res = await fetch("/api/marketplace/interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref: refCode }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase text-positive" style={{ letterSpacing: "0.16em" }}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Request sent
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={express}
      disabled={status === "sending"}
      className="inline-flex items-center gap-1.5 text-[11px] uppercase text-gold hover:text-cream disabled:opacity-60"
      style={{ letterSpacing: "0.16em" }}
    >
      {status === "sending" ? "Sending…" : status === "error" ? "Failed, try again" : "Request to connect"}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}
