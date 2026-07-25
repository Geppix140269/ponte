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
      <span className="sigsheet__done">{t("investigate.received")}</span>
    );
  }

  // The shared button, not a local imitation of it. `fbtn` and `fbtn--secondary`
  // are the public design system's buttons, so this control cannot drift away
  // from the pages it sits on.
  const triggerClass = variant === "primary" ? "fbtn" : "fbtn fbtn--secondary";

  return (
    <>
      <button type="button" onClick={() => setFormOpen(true)} className={triggerClass}>
        {label}
      </button>

      {formOpen && (
        <div
          className="sigsheet"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setFormOpen(false);
          }}
        >
          <form
            onSubmit={onSubmit}
            role="dialog"
            aria-modal="true"
            aria-label={t("cta.askPonte")}
            className="sigsheet__panel"
          >
            <div className="sigsheet__head">
              <div>
                <h2 className="sigsheet__t serif">{t("cta.askPonte")}</h2>
                <p className="sigsheet__intro">{t("investigate.intro")}</p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label={t("investigate.close")}
                className="sigsheet__close"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="sigsheet__fields">
              <div>
                <label htmlFor="inv-business" className="sigsheet__l">
                  {t("investigate.businessLabel")}
                </label>
                <input
                  ref={firstFieldRef}
                  id="inv-business"
                  required
                  value={form.requesting_business}
                  onChange={(e) => set({ requesting_business: e.target.value })}
                  className="sigsheet__i"
                  placeholder={t("investigate.businessPlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="inv-type" className="sigsheet__l">
                  {t("investigate.typeLabel")}
                </label>
                <select
                  id="inv-type"
                  required
                  value={form.requester_type ?? ""}
                  onChange={(e) =>
                    set({ requester_type: (e.target.value || null) as InvestigationRequest["requester_type"] })
                  }
                  className="sigsheet__i"
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
                <label htmlFor="inv-goal" className="sigsheet__l">
                  {t("investigate.goalLabel")}
                </label>
                <textarea
                  id="inv-goal"
                  required
                  rows={3}
                  value={form.establish_goal}
                  onChange={(e) => set({ establish_goal: e.target.value })}
                  className="sigsheet__i sigsheet__i--area"
                  placeholder={t("investigate.goalPlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="inv-indicative" className="sigsheet__l">
                  {t("investigate.indicativeLabel")}
                  <span className="sigsheet__opt">{t("investigate.optional")}</span>
                </label>
                <input
                  id="inv-indicative"
                  value={form.indicative}
                  onChange={(e) => set({ indicative: e.target.value })}
                  className="sigsheet__i"
                  placeholder={t("investigate.indicativePlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="inv-geography" className="sigsheet__l">
                  {t("investigate.geographyLabel")} <span className="sigsheet__opt">{t("investigate.optional")}</span>
                </label>
                <input
                  id="inv-geography"
                  value={form.geography}
                  onChange={(e) => set({ geography: e.target.value })}
                  className="sigsheet__i"
                  placeholder={t("investigate.geographyPlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="inv-evidence" className="sigsheet__l">
                  {t("investigate.evidenceLabel")}
                  <span className="sigsheet__opt">{t("investigate.optional")}</span>
                </label>
                <input
                  id="inv-evidence"
                  value={form.evidence}
                  onChange={(e) => set({ evidence: e.target.value })}
                  className="sigsheet__i"
                  placeholder={t("investigate.evidencePlaceholder")}
                />
              </div>

              <label className="sigsheet__check">
                <input
                  type="checkbox"
                  checked={form.wants_intro}
                  onChange={(e) => set({ wants_intro: e.target.checked })}

                />
                {t("investigate.introCheckbox")}
              </label>
            </div>

            <button
              type="submit"
              disabled={!ready || status === "sending"}
              className="fbtn fbtn--block sigsheet__submit"
            >
              {status === "sending" ? t("investigate.sending") : t("investigate.submit")}
            </button>
            {status === "error" && (
              <p className="sigsheet__err">{t("investigate.error")}</p>
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
