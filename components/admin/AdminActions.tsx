"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveVerification, rejectVerification, suspendUser, banUser, adjustTrust,
  setListingModeration, closeListing, resolveReport, dismissReport, reviewFraudFlag,
} from "@/lib/admin/admin-actions";

type Kind = "verification" | "report" | "fraud" | "user" | "listing";

export function AdminActions({ kind, id, targetId }: { kind: Kind; id: string; targetId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => { const r = await fn(); if (r.error) setErr(r.error); else { setErr(null); router.refresh(); } });

  const Btn = ({ on, children, danger }: { on: () => Promise<{ error?: string }>; children: React.ReactNode; danger?: boolean }) => (
    <button disabled={pending} onClick={() => run(on)} className={danger ? "badge hover:text-negative" : "badge-gold"}>{children}</button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {kind === "verification" && (<>
        <Btn on={() => approveVerification(id)}>Approve</Btn>
        <Btn on={() => rejectVerification(id)} danger>Reject</Btn>
      </>)}
      {kind === "report" && (<>
        <Btn on={() => resolveReport(id, true)}>Resolve + penalty</Btn>
        <Btn on={() => resolveReport(id, false)}>Resolve</Btn>
        <Btn on={() => dismissReport(id)} danger>Dismiss</Btn>
      </>)}
      {kind === "fraud" && (<>
        <Btn on={() => reviewFraudFlag(id, "reviewed")}>Reviewed</Btn>
        <Btn on={() => reviewFraudFlag(id, "cleared")} danger>Clear</Btn>
      </>)}
      {kind === "user" && (<>
        <Btn on={() => adjustTrust(id, 5)}>+5</Btn>
        <Btn on={() => adjustTrust(id, -5)}>-5</Btn>
        <Btn on={() => suspendUser(id)} danger>Suspend</Btn>
        <Btn on={() => banUser(id)} danger>Ban</Btn>
      </>)}
      {kind === "listing" && (<>
        <Btn on={() => setListingModeration(id, "approved")}>Approve</Btn>
        <Btn on={() => setListingModeration(id, "rejected")} danger>Reject</Btn>
        <Btn on={() => closeListing(id)} danger>Close</Btn>
      </>)}
      {err && <span className="text-negative text-[11px]">{err}</span>}
    </div>
  );
}
