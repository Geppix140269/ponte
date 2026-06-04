"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDeal } from "@/lib/network/deal-actions";

export function EnquireButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-3">
      <button
        className="btn-gold"
        disabled={pending}
        onClick={() => start(async () => {
          const res = await createDeal(listingId);
          if (res.error) setErr(res.error);
          else router.push(`/network/deals/${res.id}`);
        })}
      >
        {pending ? "Opening…" : "Open deal room"}
      </button>
      {err && <span className="text-negative text-sm">{err}</span>}
    </span>
  );
}
