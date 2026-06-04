"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, FileUp, Download } from "lucide-react";
import { nextStages } from "@/lib/network/deal-stages";
import {
  sendMessage, advanceStage, acceptContact, uploadDealDocument, getDealDocumentUrl,
} from "@/lib/network/deal-actions";
import type { DealRoom as Room } from "@/lib/network/deal-data";
import type { DealStage } from "@/lib/types/network";

const STAGE_LABEL: Record<DealStage, string> = {
  enquiry: "Enquiry", offer: "Offer", negotiation: "Negotiation", closed: "Closed", cancelled: "Cancelled",
};

export function DealRoom({ room }: { room: Room }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const refresh = () => router.refresh();
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => { const r = await fn(); if (r.error) setErr(r.error); else { setErr(null); refresh(); } });

  const counterpart = room.viewerRole === "initiator" ? room.counterparty : room.initiator;
  const stages = nextStages(room.stage);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Conversation */}
      <div className="glass p-6 flex flex-col">
        <div className="flex items-center justify-between">
          <h1 className="serif text-white" style={{ fontSize: 22, fontWeight: 500 }}>{room.title ?? "Deal"}</h1>
          <span className="badge-gold">{STAGE_LABEL[room.stage]}</span>
        </div>

        {!room.contactUnlocked && (
          <p className="mt-3 inline-flex items-center gap-2 text-[12px] text-gray-2"><Lock className="h-3.5 w-3.5" /> Contact details are hidden until both sides accept.</p>
        )}

        <div className="mt-5 flex-1 space-y-3 max-h-[50vh] overflow-y-auto">
          {room.messages.map((m) => {
            const mine = m.sender_id === (room.viewerRole === "initiator" ? room.initiator?.id : room.counterparty?.id);
            return (
              <div key={m.id} className={`max-w-[80%] ${mine ? "ml-auto text-right" : ""}`}>
                <div className={`inline-block px-4 py-2 rounded-lg text-[14px] ${mine ? "bg-gold/20 text-cream" : "bg-white/6 text-gray-2"}`}>{m.body}</div>
              </div>
            );
          })}
          {room.messages.length === 0 && <p className="text-gray-2 text-[13px]">No messages yet.</p>}
        </div>

        {!["closed", "cancelled"].includes(room.stage) && (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const body = String(fd.get("body") || ""); if (body.trim()) { (e.currentTarget as HTMLFormElement).reset(); run(() => sendMessage(room.id, body)); } }}
          >
            <input name="body" placeholder="Write a message…" className="field flex-1" />
            <button type="submit" disabled={pending} className="btn-gold">Send</button>
          </form>
        )}
        {err && <p className="mt-2 text-negative text-sm">{err}</p>}
      </div>

      {/* Side panel */}
      <div className="space-y-5">
        <div className="glass p-5">
          <p className="mono text-[10px] text-gray-2 uppercase" style={{ letterSpacing: "0.18em" }}>Counterparty</p>
          <p className="mt-1 text-white">{counterpart?.company ?? counterpart?.full_name ?? "—"}</p>
          {counterpart && <p className="text-[12px] text-gray-2">trust {counterpart.trust_score} · {counterpart.verification_level.replace("_", " ")}</p>}
        </div>

        {/* Stage controls */}
        {stages.length > 0 && (
          <div className="glass p-5">
            <p className="mono text-[10px] text-gray-2 uppercase mb-3" style={{ letterSpacing: "0.18em" }}>Move stage</p>
            <div className="flex flex-wrap gap-2">
              {stages.map((s) => (
                <button key={s} disabled={pending} onClick={() => run(() => advanceStage(room.id, s))}
                  className={s === "cancelled" ? "badge hover:text-negative" : "badge-gold"}>{STAGE_LABEL[s]}</button>
              ))}
            </div>
          </div>
        )}

        {/* Contact gate */}
        <div className="glass p-5">
          <p className="mono text-[10px] text-gray-2 uppercase mb-2" style={{ letterSpacing: "0.18em" }}>Contact exchange</p>
          {room.contactUnlocked ? (
            <p className="inline-flex items-center gap-2 text-positive text-sm"><Unlock className="h-4 w-4" /> Unlocked</p>
          ) : room.viewerAccepted ? (
            <p className="text-[13px] text-gray-2">You accepted. Waiting for the other side.</p>
          ) : (
            <button disabled={pending} onClick={() => run(() => acceptContact(room.id))} className="btn-gold">Accept contact exchange</button>
          )}
        </div>

        {/* Documents */}
        <div className="glass p-5">
          <p className="mono text-[10px] text-gray-2 uppercase mb-3" style={{ letterSpacing: "0.18em" }}>Documents</p>
          <ul className="space-y-2">
            {room.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-[13px]">
                <span className="text-gray-2 truncate">{d.name}</span>
                <button className="text-gold hover:text-cream inline-flex items-center gap-1"
                  onClick={() => start(async () => { const r = await getDealDocumentUrl(d.id); if (r.url) window.open(r.url, "_blank"); })}>
                  <Download className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {room.documents.length === 0 && <li className="text-gray-2 text-[13px]">None yet.</li>}
          </ul>
          <form
            className="mt-3"
            onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => uploadDealDocument(room.id, fd)); (e.currentTarget as HTMLFormElement).reset(); }}
          >
            <label className="inline-flex items-center gap-2 text-[12px] text-gold cursor-pointer">
              <FileUp className="h-4 w-4" />
              <input type="file" name="file" className="hidden" onChange={(e) => e.currentTarget.form?.requestSubmit()} />
              Upload a document
            </label>
          </form>
        </div>

        {/* Activity */}
        <div className="glass p-5">
          <p className="mono text-[10px] text-gray-2 uppercase mb-3" style={{ letterSpacing: "0.18em" }}>Activity</p>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {room.events.slice().reverse().map((ev) => (
              <li key={ev.id} className="text-[12px] text-gray-2">
                {ev.type.replace("_", " ")}{ev.detail ? `: ${ev.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
