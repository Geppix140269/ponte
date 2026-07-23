"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icons";
import AccountGate from "@/components/AccountGate";
import {
  REQUESTER_TYPES,
  cleanInvestigation,
  investigationIsComplete,
  type InvestigationRequest,
  type RequesterType,
} from "@/lib/signals/investigation";

/**
 * "Ask Ponte to investigate" on a Market Signal (brief Block D).
 *
 * A structured request behind the account gate, in place of the old link to a
 * generic contact form. The visitor fills it anonymously; the gate confirms
 * their email on Send and the same request is submitted without re-typing. It
 * enters the admin investigation queue and never reveals or contacts the third
 * party behind the signal, which is the whole reason a Market Signal is a
 * signal and not an introduction.
 *
 * Chrome reads from the "marketSignals" message namespace (Block E), so the
 * form localises with the rest of the site. The CTA `label` is resolved by the
 * caller so a signal can prime the contextual (supply/buy) wording.
 */

const EMPTY: InvestigationRequest = {
  requesting_business: "",
  requester_type: null,
  establish_goal: "",
  indicative: "",
  geography: "",
  evidence: "",
  wants_intro: false,
};

export default function InvestigateButton({
  signalId,
  label,
  variant = "primary",
  initialType = null,
}: {
  signalId: string;
  label: string;
  variant?: "primary" | "secondary";
  /** Pre-selects the requester type, for a role-primed contextual CTA. */
  initialType?: RequesterType | null;
}) {
  const t = useTranslations("marketSignals");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formOpen, setFormOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [form, setForm] = useState<InvestigationRequest>({
    ...EMPTY,
    requester_type: initialType,
  });
  const pending = useRef<InvestigationRequest>(EMPTY);
  const inFlight = useRef(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formOpen) {
      const id = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
  }, [formOpen]);

  const post = useCallback(
    async (payload: InvestigationRequest) => {
      setStatus("sending");
      const res = await fetch("/api/market-signals/investigate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signal_id: signalId, ...payload }),
      });
      if (res.status === 401) {
        pending.current = payload;
        setStatus("idle");
        setFormOpen(false);
        setGateOpen(true);
        return;
      }
      if (!res.ok) {
        setStatus("error");
        throw new Error("failed");
      }
      setStatus("sent");
      setFormOpen(false);
    },
    [signalId],
  );

  const resume = useCallback(() => post(pending.current), [post]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const payload = cleanInvestigation(form);
    if (!investigationIsComplete(payload)) return;
    inFlight.current = true;
    try {
      await post(payload);
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }

  const ready = investigationIsComplete(cleanInvestigation(form));
  const set = (patch: Partial<InvestigationRequest>) =>
    setForm((f) => ({ ...f, ...patch }));

  if (status === "sent") {
    return (
      <span className="inline-flex items-center justify-center gap-2 rounded-[15px] border border-hairline-strong bg-white/[0.06] px-6 py-[15px] text-[15px] font-bold text-ink">
        <Icon name="check" size={16} /> {t("investigate.received")}
      </span>
    );
  }

  const triggerClass =
    variant === "primary"
      ? "inline-flex items-center justify-center gap-2 rounded-[15px] bg-lime px-6 py-[15px] text-[15px] font-bold text-obsidian shadow-lime transition-transform hover:-translate-y-px"
      : "inline-flex items-center justify-center rounded-[15px] border border-hairline-strong bg-white/[0.06] px-6 py-[15px] text-[15px] font-bold text-ink transition-colors hover:bg-white/10";

  return (
    <>
      <button type="button" onClick={() => setFormOpen(true)} className={triggerClass}>
        {label}
        {variant === "primary" && <Icon name="chevron" size={16} />}
      </button>

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
            aria-label={t("cta.askPonte")}
            className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-glass border border-hairline bg-surface p-6 text-left shadow-glass sm:rounded-glass sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="display text-[20px] leading-tight text-ink">
                  {t("cta.askPonte")}
                </h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                  {t("investigate.intro")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label={t("investigate.close")}
                className="-mr-1 -mt-1 rounded-full p-2 text-muted transition-colors hover:text-ink"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="inv-business" className="field-label">
                  {t("investigate.businessLabel")}
                </label>
                <input
                  ref={firstFieldRef}
                  id="inv-business"
                  required
                  value={form.requesting_business}
                  onChange={(e) => set({ requesting_business: e.target.value })}
                  className="field"
                  placeholder={t("investigate.businessPlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="inv-type" className="field-label">
                  {t("investigate.typeLabel")}
                </label>
                <select
                  id="inv-type"
                  required
                  value={form.requester_type ?? ""}
                  onChange={(e) =>
                    set({ requester_type: (e.target.value || null) as InvestigationRequest["requester_type"] })
                  }
                  className="field"
                >
                  <option value="">{t("investigate.typeSelect")}</option>
                  {REQUESTER_TYPES.map((rt) => (
                    <option key={rt} value={rt}>
                      {t(`investigate.requesterType.${rt}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="inv-goal" className="field-label">
                  {t("investigate.goalLabel")}
                </label>
                <textarea
                  id="inv-goal"
                  required
                  rows={3}
                  value={form.establish_goal}
                  onChange={(e) => set({ establish_goal: e.target.value })}
                  className="field resize-none"
                  placeholder={t("investigate.goalPlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="inv-indicative" className="field-label">
                  {t("investigate.indicativeLabel")}
                  <span className="ml-1 text-muted">{t("investigate.optional")}</span>
                </label>
                <input
                  id="inv-indicative"
                  value={form.indicative}
                  onChange={(e) => set({ indicative: e.target.value })}
                  className="field"
                  placeholder={t("investigate.indicativePlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="inv-geography" className="field-label">
                  {t("investigate.geographyLabel")} <span className="ml-1 text-muted">{t("investigate.optional")}</span>
                </label>
                <input
                  id="inv-geography"
                  value={form.geography}
                  onChange={(e) => set({ geography: e.target.value })}
                  className="field"
                  placeholder={t("investigate.geographyPlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="inv-evidence" className="field-label">
                  {t("investigate.evidenceLabel")}
                  <span className="ml-1 text-muted">{t("investigate.optional")}</span>
                </label>
                <input
                  id="inv-evidence"
                  value={form.evidence}
                  onChange={(e) => set({ evidence: e.target.value })}
                  className="field"
                  placeholder={t("investigate.evidencePlaceholder")}
                />
              </div>

              <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate">
                <input
                  type="checkbox"
                  checked={form.wants_intro}
                  onChange={(e) => set({ wants_intro: e.target.checked })}
                  className="mt-0.5"
                />
                {t("investigate.introCheckbox")}
              </label>
            </div>

            <button
              type="submit"
              disabled={!ready || status === "sending"}
              className="btn-primary mt-5 w-full disabled:opacity-60"
            >
              {status === "sending" ? t("investigate.sending") : t("investigate.submit")}
            </button>
            {status === "error" && (
              <p className="mt-2 text-[13px] text-coral">{t("investigate.error")}</p>
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
