"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useOtp } from "@/lib/auth/use-otp";
import OtpInput from "@/components/OtpInput";
import { Icon } from "@/components/icons";
import { COUNTRIES } from "@/lib/countries";

/**
 * C7: the account gate.
 *
 * The gate fires at the moment of irreversible action and nowhere else. A
 * visitor browses, filters, reads a listing and writes an entire inquiry
 * without ever meeting it. It appears on Send, on Publish, on Save, on Verify,
 * and its whole job is to take under a minute and give the visitor their work
 * back finished.
 *
 * Three things follow from that and none of them are cosmetic:
 *
 *   1. It is a modal over the page, not a route. The visitor's draft is still
 *      there behind it, dimmed, which is the difference between "sign in to
 *      continue" and "sign in and I will finish this for you".
 *   2. It never redirects. The session is established in this component's own
 *      context by useOtp, and the pending action runs here the moment it is.
 *      A redirect would lose the draft, which is the thing being protected.
 *   3. It completes the action itself. Signing in and being returned to a form
 *      you now have to submit again is not the flow the brief specifies.
 *
 * A returning member skips the profile step: it exists to collect a name and a
 * company once, not to interrogate somebody who already gave them.
 *
 * One constraint on callers: do not set `disabled` on the button that opens
 * this. A disabled element is blurred by the browser, so focus has already
 * fallen to <body> by the time the gate mounts, and there is nothing left to
 * hand focus back to on close. Guard a double press with a ref instead. See
 * InterestButton.
 */

export type GateContext = "inquiry" | "publish" | "alert" | "verify";

type Step = "email" | "code" | "profile" | "done";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * The visitor's country, guessed from the browser's own locale so the field
 * arrives filled. A guess, explicitly editable, and never blocking: the whole
 * point of the onboarding spec is two fields, not three.
 */
function guessCountry(): string {
  if (typeof navigator === "undefined") return "";
  for (const tag of navigator.languages ?? [navigator.language]) {
    const region = new Intl.Locale(tag).maximize().region;
    if (region && COUNTRIES.some((c) => c.code === region)) return region;
  }
  return "";
}

async function generateNoncePair(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const hashBuf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  const hashed = Array.from(new Uint8Array(hashBuf), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return { raw, hashed };
}

export default function AccountGate({
  open,
  context,
  onClose,
  onComplete,
}: {
  open: boolean;
  context: GateContext;
  onClose: () => void;
  /** The action the visitor was trying to take. Runs once, after sign-in. */
  onComplete: () => void | Promise<void>;
}) {
  const t = useTranslations("gate");
  // The code step says exactly what the login page says, already translated.
  const tl = useTranslations("login");

  const [step, setStep] = useState<Step>("email");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<{ credits: number; cost: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [nonces, setNonces] = useState<{ raw: string; hashed: string } | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const googleRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  // Whoever was focused when the gate opened gets focus back when it closes.
  const returnFocusTo = useRef<HTMLElement | null>(null);
  // The pending action must run once. Without this a re-render mid-flight
  // sends the inquiry twice, and the member cannot unsend one.
  const ran = useRef(false);

  /** Sign-in is done. Finish the visitor's work and tell them it is finished. */
  const runPendingAction = useCallback(async () => {
    if (ran.current) return;
    ran.current = true;
    setStep("done");
    setActionError(null);

    // Real numbers or no numbers. If the balance cannot be read the line is
    // omitted rather than guessed at, because "You have 3 credits" is a claim
    // about somebody's account.
    try {
      const res = await fetch("/api/credits/balance");
      if (res.ok) {
        const json = await res.json();
        if (typeof json.balance === "number") {
          setBalance({ credits: json.balance, cost: json.prices?.verification ?? 2 });
        }
      }
    } catch {
      /* the line is optional, the action is not */
    }

    try {
      await onComplete();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : t("actionFailed"));
    }
  }, [onComplete, t]);

  /** OTP verified. A returning member with a profile skips the profile step. */
  const afterVerified = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, company, country")
          .eq("id", user.user.id)
          .maybeSingle();
        if (profile?.full_name && profile?.company) {
          await runPendingAction();
          return;
        }
        setFullName(profile?.full_name ?? "");
        setCompany(profile?.company ?? "");
        setCountry(profile?.country || guessCountry());
      }
    } catch {
      setCountry(guessCountry());
    }
    setStep("profile");
  }, [runPendingAction]);

  const otp = useOtp({ onVerified: afterVerified });

  // Keep the gate's own step in sync with the sign-in sub-flow, so "use a
  // different email" walks back from the code boxes to the email field.
  useEffect(() => {
    if (step === "profile" || step === "done") return;
    setStep(otp.step === "code" ? "code" : "email");
  }, [otp.step, step]);

  useEffect(() => {
    if (open) generateNoncePair().then(setNonces);
  }, [open]);

  // `onClose` is a fresh closure on every render of the caller, so it must not
  // be a dependency of the effect below. It was, once, and the effect tore
  // down and re-ran on every render: the captured trigger was overwritten with
  // whatever happened to be focused at that moment, the scroll lock thrashed,
  // and focus was yanked back to the email field mid-flow. The ref keeps the
  // handler current without making the effect depend on its identity.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape closes, the page behind does not scroll, and focus starts on the
  // one field there is. Runs once per open, which is the only time any of
  // this is true.
  useEffect(() => {
    if (!open) return;
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      // Focus stays inside the dialog. A tab that escapes to the dimmed page
      // behind is how a modal becomes a trap for a keyboard user.
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    const focusTimer = window.setTimeout(() => emailRef.current?.focus(), 40);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = overflow;
      window.clearTimeout(focusTimer);
      returnFocusTo.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (step === "profile") nameRef.current?.focus();
  }, [step]);

  // Google, as the secondary door. Same rule as the code path: whoever was
  // signed in before does not get to survive a new sign-in.
  useEffect(() => {
    if (!open || step !== "email") return;
    if (!scriptLoaded || !nonces || !GOOGLE_CLIENT_ID || !googleRef.current) return;
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce: nonces.hashed,
      use_fedcm_for_prompt: true,
      callback: async (response) => {
        const supabase = createClient();
        await supabase.auth.signOut();
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
          nonce: nonces.raw,
        });
        if (!error) await afterVerified();
      },
    });
    window.google.accounts.id.renderButton(googleRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 320,
      locale: "en",
    });
  }, [open, step, scriptLoaded, nonces, afterVerified]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            company: company.trim(),
            country: country || null,
          })
          .eq("id", user.user.id);
      }
    } catch {
      // A profile that did not save is not worth losing the inquiry over. The
      // dashboard checklist asks again.
    } finally {
      setSaving(false);
    }
    await runPendingAction();
  }

  if (!open) return null;

  const errorCopy =
    otp.errorKind === "expired"
      ? tl("code.expired")
      : otp.errorKind === "wrong"
        ? tl("code.wrong")
        : otp.errorKind === "mismatch"
          ? tl("errorFallback")
          : otp.errorDetail ?? tl("errorFallback");

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      {/* The draft stays visible behind this, dimmed. That is deliberate: the
          visitor can see their work is still there while they sign in. */}
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-obsidian-deep/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-title"
          className="w-full max-w-[440px] rounded-t-glass border border-hairline bg-surface p-6 shadow-glass sm:rounded-glass sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="gate-title" className="display text-[22px] leading-tight text-ink">
              {step === "done"
                ? t(`done.${context}`)
                : step === "profile"
                  ? t("profile.heading")
                  : step === "code"
                    ? tl("code.heading")
                    : t(`title.${context}`)}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="-mr-1 -mt-1 rounded-full p-2 text-muted transition-colors hover:text-ink"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* ===== A1: one email field ===== */}
          {step === "email" && (
            <div className="mt-3 space-y-5">
              <p className="text-[13.5px] leading-relaxed text-muted">
                {t(`body.${context}`)}
              </p>

              {GOOGLE_CLIENT_ID && (
                <>
                  <div ref={googleRef} className="flex justify-center" />
                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-label text-muted">
                    <span className="h-px flex-1 bg-white/10" /> {tl("or")}{" "}
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                </>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  otp.requestCode(otp.email);
                }}
                className="space-y-3"
              >
                <div>
                  <label htmlFor="gate-email" className="field-label">
                    {tl("emailLabel")}
                  </label>
                  <input
                    ref={emailRef}
                    id="gate-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={otp.email}
                    onChange={(e) => otp.setEmail(e.target.value)}
                    className="field"
                    placeholder={tl("emailPlaceholder")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={otp.status === "sending"}
                  className="btn-primary w-full disabled:opacity-60"
                >
                  {otp.status === "sending" ? tl("sending") : tl("submit")}
                </button>
                {otp.status === "error" && (
                  <p className="text-[13px] text-coral">{errorCopy}</p>
                )}
              </form>
            </div>
          )}

          {/* ===== A2: the code ===== */}
          {step === "code" && (
            <div className="mt-3 space-y-5">
              <p className="text-[13.5px] leading-relaxed text-muted">
                {tl("code.sentTo", { email: otp.email })}
              </p>

              {otp.notice && (
                <p className="rounded-field border border-cyan/30 bg-cyan/10 px-4 py-3 text-[13px] text-cyan">
                  {otp.notice === "resent" ? tl("code.resent") : tl("code.switched")}
                </p>
              )}

              <OtpInput
                value={otp.code}
                onChange={otp.setCode}
                onComplete={otp.verify}
                disabled={otp.status === "verifying"}
                invalid={otp.status === "error"}
                label={tl("code.label")}
              />

              {otp.status === "verifying" && (
                <p className="text-[13px] text-muted">{tl("code.verifying")}</p>
              )}
              {otp.status === "error" && (
                <p className="text-[13px] text-coral">{errorCopy}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <button
                  type="button"
                  onClick={() => otp.requestCode(otp.email, true)}
                  disabled={otp.status === "sending" || otp.status === "verifying"}
                  className="text-[11px] uppercase tracking-label text-lime disabled:opacity-50"
                >
                  {otp.status === "sending" ? tl("sending") : tl("code.resend")}
                </button>
                <button
                  type="button"
                  onClick={otp.backToEmail}
                  className="text-[11px] uppercase tracking-label text-muted hover:text-ink"
                >
                  {tl("code.changeEmail")}
                </button>
              </div>
            </div>
          )}

          {/* ===== A3: exactly two fields ===== */}
          {step === "profile" && (
            <form onSubmit={saveProfile} className="mt-3 space-y-4">
              <p className="text-[13.5px] leading-relaxed text-muted">
                {t("profile.body")}
              </p>
              <div>
                <label htmlFor="gate-name" className="field-label">
                  {t("profile.nameLabel")}
                </label>
                <input
                  ref={nameRef}
                  id="gate-name"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="gate-company" className="field-label">
                  {t("profile.companyLabel")}
                </label>
                <input
                  id="gate-company"
                  required
                  autoComplete="organization"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="gate-country" className="field-label">
                  {t("profile.countryLabel")}
                </label>
                <select
                  id="gate-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="field"
                >
                  <option value="">{t("profile.countryUnset")}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full disabled:opacity-60"
              >
                {saving ? t("profile.saving") : t("profile.submit")}
              </button>
            </form>
          )}

          {/* ===== Done: the action is finished, and what they now have ===== */}
          {step === "done" && (
            <div className="mt-3 space-y-4">
              <p className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-lime" />
                {t(`doneBody.${context}`)}
              </p>

              {/* Real balance, real price, or the line does not appear. */}
              {balance && (
                <p className="rounded-field border border-hairline bg-white/[0.04] px-4 py-3 text-[13px] text-slate">
                  {t("credits", {
                    balance: balance.credits,
                    cost: balance.cost,
                  })}
                </p>
              )}

              {actionError && <p className="text-[13px] text-coral">{actionError}</p>}

              <button type="button" onClick={onClose} className="btn-primary w-full">
                {t("doneCta")}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
