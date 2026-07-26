"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icons";
import AccountGate from "@/components/AccountGate";
import {
  CONTACT_LANGUAGES,
  REQUESTER_TYPES,
  cleanInvestigation,
  investigationIsComplete,
  type InvestigationRequest,
  type RequestKind,
  type RequesterType,
} from "@/lib/signals/investigation";

/**
 * The two member actions on a Market Signal (brief Block D).
 *
 * Both are structured requests behind the account gate, filled anonymously; the
 * gate confirms the member's email on Send and the same request is submitted
 * without re-typing. Both enter the admin queue, and neither reveals or
 * contacts the third party behind the signal, which is the whole reason a
 * Market Signal is a signal and not an introduction.
 *
 * What they are NOT is the same questionnaire. They ask different questions
 * because they are different acts:
 *
 *   investigate  You want the desk to establish something. It asks what.
 *   capability   You are answering the signal. It asks what you can supply, or
 *                what you would buy, and never asks a supplier what it wants
 *                Ponte to establish, which is not the supplier's question.
 *
 * On a capability declaration the role is already known from the button that
 * opened it (a supply button means a potential supplier), so it is stated
 * rather than asked.
 *
 * Chrome reads from the "marketSignals" message namespace (Block E), so the
 * form localises with the rest of the site. The CTA `label` is resolved by the
 * caller so a signal can prime the contextual (supply/buy) wording.
 */

const EMPTY: InvestigationRequest = {
  request_kind: "investigate",
  requesting_business: "",
  requester_type: null,
  contact_phone: "",
  contact_language: "English",
  establish_goal: "",
  capability: "",
  indicative: "",
  geography: "",
  evidence: "",
  wants_intro: false,
};

export default function InvestigateButton({
  signalId,
  label,
  variant = "primary",
  kind = "investigate",
  initialType = null,
}: {
  signalId: string;
  label: string;
  variant?: "primary" | "secondary";
  /** Which act this button performs. Decides the questions asked. */
  kind?: RequestKind;
  /**
   * The requester's role. On a capability declaration it is known from the
   * button and is shown rather than asked; on an investigation it only
   * pre-selects the field.
   */
  initialType?: RequesterType | null;
}) {
  const t = useTranslations("marketSignals");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formOpen, setFormOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [form, setForm] = useState<InvestigationRequest>({
    ...EMPTY,
    request_kind: kind,
    requester_type: initialType,
  });
  const pending = useRef<InvestigationRequest>(EMPTY);
  const inFlight = useRef(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const capability = kind === "capability";
  /** "supplier" and "buyer" are the only roles a capability button can carry. */
  const side: "supplier" | "buyer" = initialType === "buyer" ? "buyer" : "supplier";
  const title = capability ? t(`capability.title.${side}`) : t("cta.askPonte");

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
      <span className="sigsheet__done">
        {capability ? t("capability.received") : t("investigate.received")}
      </span>
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
            aria-label={title}
            className="sigsheet__panel"
          >
            <div className="sigsheet__head">
              <div>
                <h2 className="sigsheet__t serif">{title}</h2>
                <p className="sigsheet__intro">
                  {capability ? t(`capability.intro.${side}`) : t("investigate.intro")}
                </p>
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

              {/* How the desk reaches them. Both requests are worked by a
                  person who needs to ask a question back, so the number is
                  asked for here rather than chased later, and the language is
                  asked so the call is placed by someone who can be understood.
                  Neither is ever shown to another member. */}
              <div className="sigsheet__pair">
                <div>
                  <label htmlFor="inv-phone" className="sigsheet__l">
                    {t("investigate.phoneLabel")}
                  </label>
                  <input
                    id="inv-phone"
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.contact_phone}
                    onChange={(e) => set({ contact_phone: e.target.value })}
                    className="sigsheet__i"
                    placeholder={t("investigate.phonePlaceholder")}
                  />
                </div>
                <div>
                  <label htmlFor="inv-language" className="sigsheet__l">
                    {t("investigate.languageLabel")}
                  </label>
                  <select
                    id="inv-language"
                    value={form.contact_language}
                    onChange={(e) => set({ contact_language: e.target.value })}
                    className="sigsheet__i"
                  >
                    {CONTACT_LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="sigsheet__fine">{t("investigate.phoneNote")}</p>

              {/* The role is asked only when it is genuinely open. A capability
                  declaration was opened by a button that already said it. */}
              {capability ? (
                <p className="sigsheet__role">
                  {t("capability.roleStated", {
                    role: t(`investigate.requesterType.${side}`),
                  })}
                </p>
              ) : (
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
              )}

              {capability ? (
                <>
                  <div>
                    <label htmlFor="inv-capability" className="sigsheet__l">
                      {t(`capability.capabilityLabel.${side}`)}
                    </label>
                    <textarea
                      id="inv-capability"
                      required
                      rows={3}
                      value={form.capability}
                      onChange={(e) => set({ capability: e.target.value })}
                      className="sigsheet__i sigsheet__i--area"
                      placeholder={t(`capability.capabilityPlaceholder.${side}`)}
                    />
                  </div>

                  <div>
                    <label htmlFor="inv-indicative" className="sigsheet__l">
                      {t(`capability.volumeLabel.${side}`)}
                      <span className="sigsheet__opt">{t("investigate.optional")}</span>
                    </label>
                    <input
                      id="inv-indicative"
                      value={form.indicative}
                      onChange={(e) => set({ indicative: e.target.value })}
                      className="sigsheet__i"
                      placeholder={t(`capability.volumePlaceholder.${side}`)}
                    />
                  </div>

                  <div>
                    <label htmlFor="inv-geography" className="sigsheet__l">
                      {t(`capability.geographyLabel.${side}`)}
                      <span className="sigsheet__opt">{t("investigate.optional")}</span>
                    </label>
                    <input
                      id="inv-geography"
                      value={form.geography}
                      onChange={(e) => set({ geography: e.target.value })}
                      className="sigsheet__i"
                      placeholder={t(`capability.geographyPlaceholder.${side}`)}
                    />
                  </div>

                  <div>
                    <label htmlFor="inv-evidence" className="sigsheet__l">
                      {t("capability.evidenceLabel")}
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
                </>
              ) : (
                <>
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
                    <label htmlFor="inv-geography" className="sigsheet__l">
                      {t("investigate.geographyLabel")}{" "}
                      <span className="sigsheet__opt">{t("investigate.optional")}</span>
                    </label>
                    <input
                      id="inv-geography"
                      value={form.geography}
                      onChange={(e) => set({ geography: e.target.value })}
                      className="sigsheet__i"
                      placeholder={t("investigate.geographyPlaceholder")}
                    />
                  </div>
                </>
              )}

              <label className="sigsheet__check">
                <input
                  type="checkbox"
                  checked={form.wants_intro}
                  onChange={(e) => set({ wants_intro: e.target.checked })}
                />
                {capability ? t("capability.introCheckbox") : t("investigate.introCheckbox")}
              </label>
            </div>

            <button
              type="submit"
              disabled={!ready || status === "sending"}
              className="fbtn fbtn--block sigsheet__submit"
            >
              {status === "sending"
                ? t("investigate.sending")
                : capability
                  ? t("capability.submit")
                  : t("investigate.submit")}
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
