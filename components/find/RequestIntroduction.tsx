"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import AccountGate from "@/components/AccountGate";
import { INTEREST_ROLES, type InterestRole } from "@/lib/interest/expression";

export type RequestLabels = {
  // intro panel (O06 prerequisites)
  eyebrow: string;
  introTitle: string;
  prereqTitle: string;
  prereq1: string;
  prereq2: string;
  prereq3: string;
  open: string;
  // request form (O05)
  title: string;
  lead: string;
  readiness: string; // "{done} of {total} answered"
  roleLabel: string;
  roleBuyer: string;
  roleSeller: string;
  roleDistributor: string;
  roleIntermediary: string;
  targetLabel: string;
  targetPlaceholder: string;
  geographyLabel: string;
  geographyPlaceholder: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  voiceHint: string;
  send: string;
  reassure: string;
  contactHint: string;
  // sent (O07)
  sentAck: string;
  sentTitle: string;
  sentBody: string;
  toWorkspace: string;
};

const ROLE_LABEL_KEYS: Record<InterestRole, keyof RequestLabels> = {
  buyer: "roleBuyer",
  seller: "roleSeller",
  distributor: "roleDistributor",
  intermediary: "roleIntermediary",
};

type Phase = "intro" | "form" | "sent";

function VoiceButton({ label, onText }: { label: string; onText: (t: string) => void }) {
  const [supported] = useState(
    () =>
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
  );
  if (!supported) return null;
  return (
    <button
      type="button"
      className="reqq__voice"
      onClick={() => {
        const Ctor =
          (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
        const rec = new Ctor();
        rec.lang = document.documentElement.lang || "en-US";
        rec.interimResults = false;
        rec.onresult = (e: any) => {
          const text = e.results?.[0]?.[0]?.transcript ?? "";
          if (text) onText(text);
        };
        rec.start();
      }}
    >
      🎙 {label}
    </button>
  );
}

/**
 * The controlled introduction (O05-O07). Commercial fit first, contact second:
 * a visitor completes role, capability, geography and a reason for fit BEFORE
 * any account gate. The gate (reused AccountGate, "inquiry") appears only when
 * they press Send, and the exact request resumes once after authentication ,
 * the component stays mounted, so nothing is retyped and nothing is lost. The
 * business name is filled from the member's own profile via /api/me, never
 * asked twice.
 */
export default function RequestIntroduction({
  reference,
  product,
  labels,
  disabled,
}: {
  reference: string;
  product: string;
  labels: RequestLabels;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [role, setRole] = useState<InterestRole | null>(null);
  const [target, setTarget] = useState("");
  const [geography, setGeography] = useState("");
  const [reason, setReason] = useState("");
  const [gateOpen, setGateOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false); // resume-once guard

  const done = [role, target.trim(), geography.trim(), reason.trim()].filter(Boolean).length;
  const total = 4;
  const complete = done === total;

  const doSend = useCallback(
    async (business: string) => {
      setSending(true);
      setError(null);
      try {
        const res = await fetch("/api/marketplace/interest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ref: reference,
            interested_business: business,
            interest_role: role,
            interest_target: target,
            interest_geography: geography,
            interest_reason: reason,
          }),
        });
        if (res.status === 401) {
          setGateOpen(true);
          return false;
        }
        if (!res.ok) {
          setError("send");
          return false;
        }
        setPhase("sent");
        return true;
      } catch {
        setError("send");
        return false;
      } finally {
        setSending(false);
      }
    },
    [reference, role, target, geography, reason],
  );

  // Read the signed-in member's business (and whether they are signed in) so the
  // request can carry interested_business without asking for it again.
  const me = useCallback(async (): Promise<{ signedIn: boolean; business: string; name: string }> => {
    try {
      const r = await fetch("/api/me");
      const j = await r.json();
      return { signedIn: !!j.signedIn, business: j.business ?? "", name: j.name ?? "" };
    } catch {
      return { signedIn: false, business: "", name: "" };
    }
  }, []);

  const onSend = useCallback(async () => {
    if (!complete || sending) return;
    const who = await me();
    if (!who.signedIn) {
      setGateOpen(true);
      return;
    }
    await doSend(who.business || who.name || "Member");
  }, [complete, sending, me, doSend]);

  // Resume exactly once after the gate completes.
  const onGateComplete = useCallback(async () => {
    if (ran.current) return;
    ran.current = true;
    setGateOpen(false);
    const who = await me();
    await doSend(who.business || who.name || "Member");
  }, [me, doSend]);

  if (phase === "sent") {
    return (
      <div className="qintro">
        <div className="qintro__top">
          <span className="qintro__eb">{labels.eyebrow}</span>
        </div>
        <div className="sent" style={{ padding: "16px" }}>
          <span className="sent__ack">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {labels.sentAck}
          </span>
          <h3 className="sent__h serif" style={{ color: "var(--surface)" }}>{labels.sentTitle}</h3>
          <p style={{ color: "rgba(242,239,232,0.86)", fontSize: 13.5, margin: 0 }}>{labels.sentBody}</p>
          <button type="button" className="fbtn" style={{ marginTop: 8 }} onClick={() => router.push("/workspace")}>
            {labels.toWorkspace}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="qintro">
        <div className="qintro__top">
          <span className="qintro__eb">{labels.eyebrow}</span>
          <h3 className="qintro__h serif">{labels.introTitle}</h3>
        </div>
        <ol className="qintro__steps">
          <li><span className="qintro__num">1</span><span>{labels.prereq1}</span></li>
          <li><span className="qintro__num">2</span><span>{labels.prereq2}</span></li>
          <li><span className="qintro__num">3</span><span>{labels.prereq3}</span></li>
        </ol>
        <div className="qintro__foot">
          <button
            type="button"
            className="fbtn fbtn--block"
            disabled={disabled}
            onClick={() => setPhase("form")}
          >
            {labels.open}
          </button>
        </div>
      </div>
    );
  }

  // phase === "form"
  return (
    <div className="qintro">
      <div className="qintro__top">
        <span className="qintro__eb">{labels.eyebrow}</span>
        <h3 className="qintro__h serif">{labels.title}</h3>
      </div>
      <div style={{ padding: "16px" }}>
        <div className="reqctx" style={{ borderColor: "rgba(242,239,232,0.14)", color: "rgba(242,239,232,0.86)" }}>
          <span className="g-dot" aria-hidden="true" />
          <span>{product} · {reference}</span>
        </div>

        <div className="readiness" style={{ margin: "16px 0" }}>
          <div className="readiness__track" style={{ background: "rgba(242,239,232,0.14)" }}>
            <div className="readiness__fill" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="readiness__label" style={{ color: "rgba(242,239,232,0.7)" }}>
            {labels.readiness.replace("{done}", String(done)).replace("{total}", String(total))}
          </span>
        </div>

        <div className="req">
          <div className="reqq">
            <span className="reqq__label" style={{ color: "var(--surface)" }}>{labels.roleLabel}</span>
            <div className="reqq__chips">
              {INTEREST_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="fchip"
                  aria-pressed={role === r}
                  onClick={() => setRole(r)}
                >
                  {labels[ROLE_LABEL_KEYS[r]]}
                </button>
              ))}
            </div>
          </div>

          <FormNote
            label={labels.targetLabel}
            placeholder={labels.targetPlaceholder}
            voiceHint={labels.voiceHint}
            value={target}
            onChange={setTarget}
          />
          <FormNote
            label={labels.geographyLabel}
            placeholder={labels.geographyPlaceholder}
            voiceHint={labels.voiceHint}
            value={geography}
            onChange={setGeography}
          />
          <FormNote
            label={labels.reasonLabel}
            placeholder={labels.reasonPlaceholder}
            voiceHint={labels.voiceHint}
            value={reason}
            onChange={setReason}
          />

          <button
            type="button"
            className="fbtn fbtn--block fbtn--lg"
            disabled={!complete || sending || disabled}
            onClick={onSend}
          >
            {labels.send}
          </button>
          {error && <p className="req__reassure" style={{ color: "var(--neg)" }}>{labels.reassure}</p>}
          <p className="req__reassure" style={{ color: "rgba(242,239,232,0.7)" }}>{labels.reassure}</p>
          <p className="req__reassure" style={{ color: "rgba(242,239,232,0.7)" }}>{labels.contactHint}</p>
        </div>
      </div>

      <AccountGate
        open={gateOpen}
        context="inquiry"
        onClose={() => setGateOpen(false)}
        onComplete={onGateComplete}
      />
    </div>
  );
}

function FormNote({
  label,
  placeholder,
  voiceHint,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  voiceHint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="reqq">
      <span className="reqq__label" style={{ color: "var(--surface)" }}>{label}</span>
      <textarea
        className="reqq__note"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <VoiceButton label={voiceHint} onText={(t) => onChange(value ? `${value} ${t}` : t)} />
    </div>
  );
}
