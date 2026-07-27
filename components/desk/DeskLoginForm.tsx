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
export default function DeskLoginForm() {
  const t = useTranslations("login");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
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
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 360,
      locale: "en",
    });

    /**
     * Whether the button actually MOUNTED, which is not the same question as
     * whether we asked for one.
     *
     * Google Identity Services creates the iframe and then collapses it to
     * 0x0 when the page origin is not an authorised JavaScript origin for the
     * client, and it logs nothing when it does. A Netlify deploy preview mints
     * a new subdomain per pull request, so that is the normal case there. The
     * container is therefore no evidence at all: only a rendered iframe with
     * real dimensions proves the member has a Google button to press.
     *
     * Until that is true the whole Google area stays hidden, along with the
     * divider that would otherwise separate it from nothing. No error is
     * shown, because nothing has failed from the member's point of view: the
     * email code is a complete route on its own.
     */
    const host = buttonRef.current;
    const mounted = () => {
      const frame = host.querySelector("iframe");
      if (!frame) return false;
      const { width, height } = frame.getBoundingClientRect();
      return width > 0 && height > 0;
    };

    if (mounted()) {
      setGoogleReady(true);
      return;
    }

    // The iframe arrives asynchronously and may be resized after insertion, so
    // both events are watched rather than polled.
    const observer = new MutationObserver(() => {
      if (mounted()) setGoogleReady(true);
    });
    observer.observe(host, { childList: true, subtree: true, attributes: true });

    const resize = new ResizeObserver(() => {
      if (mounted()) setGoogleReady(true);
    });
    resize.observe(host);

    // A backstop for the case where the iframe is inserted at zero size and
    // never changes again, which is exactly what an unauthorised origin does.
    const settle = window.setTimeout(() => {
      if (mounted()) setGoogleReady(true);
    }, 1500);

    return () => {
      observer.disconnect();
      resize.disconnect();
      window.clearTimeout(settle);
    };
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
        src="https://accounts.google.com/gsi/client?hl=en"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <section className="sec dklogin">
        <div className="dklogin__card">
          {/* The normal Ponte eyebrow, not a pill with a status dot. A dot is
              a state marker everywhere else in this system, and nothing here
              has a state. */}
          <p className="kicker">Ponte access</p>
          <h1 className="dklogin__h serif">
            {otp.step === "code" ? t("code.heading") : "Sign in to Ponte"}
          </h1>
          <p className="dklogin__sub">
            {otp.step === "code"
              ? t("code.sentTo", { email: otp.email })
              : "Access your records, investigations and trade activity."}
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
              {/* The host is always mounted, because Google needs somewhere to
                  render into before we can know whether it will. It is hidden
                  until the button proves itself, so an empty 40px slot never
                  appears above the email form. */}
              {GOOGLE_CLIENT_ID ? (
                <div className={googleReady ? "dklogin__g" : "dklogin__g dklogin__g--wait"}>
                  <div ref={buttonRef} className="flex justify-center" />
                </div>
              ) : null}

              {googleError && <p className="text-sm text-coral">{googleError}</p>}

              {/* The divider exists only when there are two things to divide. */}
              {googleReady ? (
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-label text-muted">
                  <span className="h-px flex-1 bg-white/10" /> {t("or")}{" "}
                  <span className="h-px flex-1 bg-white/10" />
                </div>
              ) : null}

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

              {/* Below the options, because it answers a question the member
                  only has once they have seen them. It says what signing in
                  does, and nothing about how it works. */}
              <p className="dklogin__note">
                New to Ponte? Signing in creates your account.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
