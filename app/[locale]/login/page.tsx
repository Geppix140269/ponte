"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useOtp } from "@/lib/auth/use-otp";
import OtpInput from "@/components/OtpInput";
import { Icon } from "@/components/icons";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** Where to go after sign-in. Only same-site paths are honoured. */
function safeNext(): string {
  if (typeof window === "undefined") return "/account";
  const raw = new URLSearchParams(window.location.search).get("next") || "/account";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
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

/**
 * The full-page door, for somebody who came to sign in rather than to do
 * something. The gate modal is the other door and it is the one most members
 * will meet, since it opens at the moment they try to act.
 *
 * Both use `useOtp`, which is where the reasoning about codes, sessions and
 * the guards around them now lives. Read that before changing anything here.
 */
export default function LoginPage() {
  const t = useTranslations("login");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [nonces, setNonces] = useState<{ raw: string; hashed: string } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  const onVerified = useCallback(() => {
    window.location.href = safeNext();
  }, []);
  const otp = useOtp({ onVerified });

  useEffect(() => {
    generateNoncePair().then(setNonces);
    if (new URLSearchParams(window.location.search).get("error") === "auth") {
      setLinkError(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !nonces || !GOOGLE_CLIENT_ID || !buttonRef.current) return;
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce: nonces.hashed,
      use_fedcm_for_prompt: true,
      callback: async (response) => {
        try {
          const supabase = createClient();
          // Same rule as the code path: whoever was signed in before does not
          // get to survive a new sign-in.
          await supabase.auth.signOut();
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
            nonce: nonces.raw,
          });
          if (error) {
            setGoogleError(error.message);
            return;
          }
          window.location.href = safeNext();
        } catch (e: unknown) {
          setGoogleError(e instanceof Error ? e.message : t("errorUnknown"));
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 360,
      locale: "en",
    });
  }, [scriptLoaded, nonces, t]);

  const errorCopy =
    otp.errorKind === "expired"
      ? t("code.expired")
      : otp.errorKind === "wrong"
        ? t("code.wrong")
        : otp.errorKind === "mismatch"
          ? t("errorFallback")
          : otp.errorDetail ?? t("errorFallback");

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <section className="container-px py-20">
        <div className="glass mx-auto max-w-md p-8 sm:p-10">
          <span className="pill">{t("pill")}</span>
          <h1 className="display mt-6 mb-2 text-[32px] text-ink">
            {otp.step === "code" ? t("code.heading") : t("title")}
          </h1>
          <p className="mb-7 text-[14px] text-muted">
            {otp.step === "code"
              ? t("code.sentTo", { email: otp.email })
              : t("subtitle")}
          </p>

          {linkError && otp.step === "email" && (
            <div className="mb-5 rounded-field border border-lime/35 bg-lime/10 px-4 py-3 text-[13px] text-lime">
              {t("linkExpired")}
            </div>
          )}

          {!configured ? (
            <div className="glass-tight p-6 text-[13px] leading-relaxed text-muted">
              {t("notConfigured")}
            </div>
          ) : otp.step === "code" ? (
            <div className="space-y-5">
              {otp.notice && (
                <div className="flex items-center gap-2 rounded-field border border-cyan/35 bg-cyan/10 px-4 py-3 text-[13px] text-cyan">
                  <Icon name="inbox" size={16} />
                  {otp.notice === "resent" ? t("code.resent") : t("code.switched")}
                </div>
              )}

              <OtpInput
                value={otp.code}
                onChange={otp.setCode}
                onComplete={otp.verify}
                disabled={otp.status === "verifying"}
                invalid={otp.status === "error"}
                label={t("code.label")}
              />

              {otp.status === "verifying" && (
                <p className="text-[13px] text-muted">{t("code.verifying")}</p>
              )}
              {otp.status === "error" && (
                <p className="text-sm text-coral">{errorCopy}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => otp.requestCode(otp.email, true)}
                  disabled={otp.status === "sending" || otp.status === "verifying"}
                  className="text-[11px] uppercase tracking-label text-lime disabled:opacity-50"
                >
                  {otp.status === "sending" ? t("sending") : t("code.resend")}
                </button>
                <button
                  type="button"
                  onClick={otp.backToEmail}
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-label text-muted hover:text-ink"
                >
                  {t("code.changeEmail")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {GOOGLE_CLIENT_ID ? (
                <div ref={buttonRef} className="flex justify-center" />
              ) : (
                <div className="glass-tight p-4 text-[12px] text-muted">
                  {t("googleDisabled")}
                </div>
              )}
              {googleError && <p className="text-sm text-coral">{googleError}</p>}

              <div className="flex items-center gap-3 text-[10px] uppercase tracking-label text-muted">
                <span className="h-px flex-1 bg-white/10" /> {t("or")}{" "}
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  otp.requestCode(otp.email);
                }}
                className="space-y-3"
              >
                <div>
                  <label htmlFor="email" className="field-label">
                    {t("emailLabel")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={otp.email}
                    onChange={(e) => otp.setEmail(e.target.value)}
                    className="field"
                    placeholder={t("emailPlaceholder")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={otp.status === "sending"}
                  className="btn-primary w-full disabled:opacity-60"
                >
                  {otp.status === "sending" ? t("sending") : t("submit")}
                </button>
                {otp.status === "error" && (
                  <p className="text-sm text-coral">{errorCopy}</p>
                )}
              </form>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
