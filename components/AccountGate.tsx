"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useOtp } from "@/lib/auth/use-otp";
import OtpInput from "@/components/OtpInput";
import { Icon } from "@/components/icons";
import { COUNTRIES } from "@/lib/countries";

export type GateContext = "inquiry" | "publish" | "alert" | "verify";
type Step = "email" | "code" | "profile" | "done";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

function guessCountry(): string {
  if (typeof navigator === "undefined") return "";
  for (const tag of navigator.languages ?? [navigator.language]) {
    const region = new Intl.Locale(tag).maximize().region;
    if (region && COUNTRIES.some((country) => country.code === region)) return region;
  }
  return "";
}

async function generateNoncePair(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return { raw, hashed };
}

/**
 * Establishes the member session without leaving the page, preserves the work
 * visible behind the modal, and executes the captured action once.
 */
export default function AccountGate({
  open,
  context,
  onClose,
  onComplete,
}: {
  open: boolean;
  context: GateContext;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
}) {
  const t = useTranslations("gate");
  const tl = useTranslations("login");

  const [step, setStep] = useState<Step>("email");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"running" | "ok" | "failed">("running");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [nonces, setNonces] = useState<{ raw: string; hashed: string } | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const googleRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const pendingActionRef = useRef(onComplete);
  const ran = useRef(false);
  const previousOpen = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const runPendingAction = useCallback(async () => {
    if (ran.current) return;
    ran.current = true;
    setStep("done");
    setActionError(null);
    setOutcome("running");

    try {
      await pendingActionRef.current();
      setOutcome("ok");
    } catch (error: unknown) {
      setOutcome("failed");
      setActionError(error instanceof Error ? error.message : t("actionFailed"));
    }
  }, [t]);

  const afterVerified = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, company, country")
          .eq("id", data.user.id)
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

  useEffect(() => {
    const opening = open && !previousOpen.current;
    previousOpen.current = open;
    if (!opening) return;

    pendingActionRef.current = onComplete;
    ran.current = false;
    setActionError(null);
    setOutcome("running");
    setFullName("");
    setCompany("");
    setCountry("");
    otp.backToEmail();
    setStep("email");
    generateNoncePair().then(setNonces);
  }, [open, onComplete, otp]);

  useEffect(() => {
    if (step === "profile" || step === "done") return;
    setStep(otp.step === "code" ? "code" : "email");
  }, [otp.step, step]);

  useEffect(() => {
    if (!open) return;
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
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

  useEffect(() => {
    if (!open || step !== "email") return;
    if (!scriptLoaded || !nonces || !GOOGLE_CLIENT_ID || !googleRef.current || !window.google) return;

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

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            company: company.trim(),
            country: country || null,
          })
          .eq("id", data.user.id);
      }
    } catch {
      // The member's commercial action is not discarded because optional
      // profile enrichment could not be persisted.
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
      <div
        className="agate fixed inset-0 z-[100] flex items-end justify-center bg-obsidian-deep/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-title"
          className="agate__panel w-full max-w-[440px] rounded-t-glass border border-hairline bg-surface p-6 shadow-glass sm:rounded-glass sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="gate-title" className="agate__t display text-[22px] leading-tight text-ink">
              {step === "done"
                ? outcome === "ok"
                  ? t(`done.${context}`)
                  : outcome === "failed"
                    ? t("failedTitle")
                    : t("working")
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
              className="agate__close -mr-1 -mt-1 rounded-full p-2 text-muted transition-colors hover:text-ink"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {step === "email" && (
            <div className="mt-3 space-y-5">
              <p className="agate__p text-[13.5px] leading-relaxed text-muted">
                {t(`body.${context}`)}
              </p>

              {GOOGLE_CLIENT_ID && (
                <>
                  <div ref={googleRef} className="flex justify-center" />
                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-label text-muted">
                    <span className="h-px flex-1 bg-white/10" /> {tl("or")} {" "}
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                </>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  otp.requestCode(otp.email);
                }}
                className="space-y-3"
              >
                <div>
                  <label htmlFor="gate-email" className="agate__l field-label">
                    {tl("emailLabel")}
                  </label>
                  <input
                    ref={emailRef}
                    id="gate-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={otp.email}
                    onChange={(event) => otp.setEmail(event.target.value)}
                    className="agate__i field"
                    placeholder={tl("emailPlaceholder")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={otp.status === "sending"}
                  className="agate__submit btn-primary w-full disabled:opacity-60"
                >
                  {otp.status === "sending" ? tl("sending") : tl("submit")}
                </button>
                {otp.status === "error" && (
                  <p className="agate__err text-[13px] text-coral">{errorCopy}</p>
                )}
              </form>
            </div>
          )}

          {step === "code" && (
            <div className="mt-3 space-y-5">
              <p className="agate__p text-[13.5px] leading-relaxed text-muted">
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
                <p className="agate__err text-[13px] text-coral">{errorCopy}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <button
                  type="button"
                  onClick={() => otp.requestCode(otp.email, true)}
                  disabled={otp.status === "sending" || otp.status === "verifying"}
                  className="agate__link text-[11px] uppercase tracking-label text-lime disabled:opacity-50"
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

          {step === "profile" && (
            <form onSubmit={saveProfile} className="mt-3 space-y-4">
              <p className="agate__p text-[13.5px] leading-relaxed text-muted">
                {t("profile.body")}
              </p>
              <div>
                <label htmlFor="gate-name" className="agate__l field-label">
                  {t("profile.nameLabel")}
                </label>
                <input
                  ref={nameRef}
                  id="gate-name"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="agate__i field"
                />
              </div>
              <div>
                <label htmlFor="gate-company" className="agate__l field-label">
                  {t("profile.companyLabel")}
                </label>
                <input
                  id="gate-company"
                  required
                  autoComplete="organization"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="agate__i field"
                />
              </div>
              <div>
                <label htmlFor="gate-country" className="agate__l field-label">
                  {t("profile.countryLabel")}
                </label>
                <select
                  id="gate-country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="agate__i field"
                >
                  <option value="">{t("profile.countryUnset")}</option>
                  {COUNTRIES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="agate__submit btn-primary w-full disabled:opacity-60"
              >
                {saving ? t("profile.saving") : t("profile.submit")}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="mt-3 space-y-4">
              {outcome === "ok" && (
                <p className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-lime" />
                  {t(`doneBody.${context}`)}
                </p>
              )}
              {actionError && (
                <p className="agate__err text-[13px] text-coral">{actionError}</p>
              )}
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
