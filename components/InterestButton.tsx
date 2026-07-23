"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icons";
import AccountGate from "@/components/AccountGate";
import {
  INTEREST_ROLES,
  INTEREST_ROLE_LABELS,
  interestIsComplete,
  cleanInterest,
  type ExpressionOfInterest,
} from "@/lib/interest/expression";

/**
 * A structured expression of interest, with the gate attached (brief Block D).
 *
 * The trigger opens a short form: the interested business, its role, the
 * target, the geography and a reason for fit. A visitor fills the whole thing
 * anonymously; only on Send does the gate ask who they are. That ordering is
 * the point of the trigger map, and it is why the form is captured into a ref
 * before the gate opens: after sign-in the same request is sent without the
 * member re-typing a word.
 *
 * The bare one-click connect this replaced sent an owner nothing to decide on.
 * The brief requires a meaningful request; the completeness rule that defines
 * "meaningful" is the shared one in lib/interest/expression.ts, enforced here
 * for the button state and again on the server.
 */

const EMPTY: ExpressionOfInterest = {
  interested_business: "",
  interest_role: null,
  interest_target: "",
  interest_geography: "",
  interest_reason: "",
};

export default function InterestButton({ refCode }: { refCode: string }) {
  const t = useTranslations("marketplace.interest");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formOpen, setFormOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [form, setForm] = useState<ExpressionOfInterest>(EMPTY);
  // The captured request, so the gate can resume the send with the exact
  // fields the visitor filled in before they were asked to sign in.
  const pending = useRef<ExpressionOfInterest>(EMPTY);
  const inFlight = useRef(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formOpen) {
      const id = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
  }, [formOpen]);

  const post = useCallback(
    async (payload: ExpressionOfInterest) => {
      setStatus("sending");
      const res = await fetch("/api/marketplace/interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref: refCode, ...payload }),
      });
      if (res.status === 401) {
        // Not signed in. Keep the request and let the gate finish it.
        pending.current = payload;
        setStatus("idle");
        setFormOpen(false);
        setGateOpen(true);
        return;
      }
      if (!res.ok) {
        setStatus("error");
        throw new Error(t("failed"));
      }
      setStatus("sent");
      setFormOpen(false);
    },
    [refCode, t],
  );

  // The gate calls this after sign-in with no arguments, so it reads the
  // captured request rather than the live form (which the gate may have
  // unmounted).
  const resume = useCallback(() => post(pending.current), [post]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const payload = cleanInterest(form);
    if (!interestIsComplete(payload)) return;
    inFlight.current = true;
    try {
      await post(payload);
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }

  const ready = interestIsComplete(cleanInterest(form));
  const set = (patch: Partial<ExpressionOfInterest>) =>
    setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      {status === "sent" ? (
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-label text-cyan">
          <Icon name="check" size={14} /> {t("sent")}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-label text-lime hover:text-ink"
        >
          {status === "error" ? t("failed") : t("request")}
          <Icon name="chevron" size={14} />
        </button>
      )}

      {formOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-obsidian-deep/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFormOpen(false);
          }}
        >
          <form
            onSubmit={onSubmit}
            role="dialog"
            aria-modal="true"
            aria-label="Express interest"
            className="w-full max-w-[460px] rounded-t-glass border border-hairline bg-surface p-6 text-left shadow-glass sm:rounded-glass sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="display text-[20px] leading-tight text-ink">
                  Express interest
                </h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                  The owner sees this, never your name, and decides. You stay
                  anonymous until both sides agree to connect.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 rounded-full p-2 text-muted transition-colors hover:text-ink"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="eoi-business" className="field-label">
                  Your business
                </label>
                <input
                  ref={firstFieldRef}
                  id="eoi-business"
                  required
                  value={form.interested_business}
                  onChange={(e) => set({ interested_business: e.target.value })}
                  className="field"
                  placeholder="Registered company name"
                />
              </div>

              <div>
                <label htmlFor="eoi-role" className="field-label">
                  Your role
                </label>
                <select
                  id="eoi-role"
                  required
                  value={form.interest_role ?? ""}
                  onChange={(e) =>
                    set({ interest_role: (e.target.value || null) as ExpressionOfInterest["interest_role"] })
                  }
                  className="field"
                >
                  <option value="">Select a role</option>
                  {INTEREST_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {INTEREST_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="eoi-target" className="field-label">
                  Target quantity/timing, or your supply capability
                </label>
                <input
                  id="eoi-target"
                  required
                  value={form.interest_target}
                  onChange={(e) => set({ interest_target: e.target.value })}
                  className="field"
                  placeholder="e.g. 2 x 20ft/month from Q1, or 500 MT available now"
                />
              </div>

              <div>
                <label htmlFor="eoi-geography" className="field-label">
                  Geography
                </label>
                <input
                  id="eoi-geography"
                  required
                  value={form.interest_geography}
                  onChange={(e) => set({ interest_geography: e.target.value })}
                  className="field"
                  placeholder="Where you are, or the corridor you serve"
                />
              </div>

              <div>
                <label htmlFor="eoi-reason" className="field-label">
                  Short reason for fit
                </label>
                <textarea
                  id="eoi-reason"
                  required
                  rows={3}
                  value={form.interest_reason}
                  onChange={(e) => set({ interest_reason: e.target.value })}
                  className="field resize-none"
                  placeholder="Why this is a fit for you"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!ready || status === "sending"}
              className="btn-primary mt-5 w-full disabled:opacity-60"
            >
              {status === "sending" ? t("sending") : "Send expression of interest"}
            </button>
            {status === "error" && (
              <p className="mt-2 text-[13px] text-coral">{t("failed")}</p>
            )}
          </form>
        </div>
      )}

      <AccountGate
        open={gateOpen}
        context="inquiry"
        onClose={() => setGateOpen(false)}
        onComplete={resume}
      />
    </>
  );
}
