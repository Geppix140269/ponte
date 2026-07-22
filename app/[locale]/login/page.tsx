"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { Mail, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import OtpInput from "@/components/OtpInput";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            nonce: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

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
 * Sign in with a six digit code.
 *
 * This replaced a magic link, and it was a bug fix rather than a preference.
 * The link flow put the session in a redirect: Supabase verified the token and
 * sent the member to /account carrying the result in a URL fragment, and
 * /account is a Server Component with no browser Supabase client on it, so
 * nothing ever read that fragment. The session was never established, the
 * server rendered whatever cookie the browser already held, and a member who
 * signed up on a machine where someone else was signed in landed on the other
 * person's account. Nothing crossed accounts over the wire, but the member was
 * acting as somebody else, and a listing posted then belongs to the wrong name.
 *
 * A code has no redirect and no fragment. It is typed into the page that asked
 * for it, and verifyOtp establishes the session in that page's own context,
 * where the browser client is right there to receive it.
 *
 * Two further guards, because the failure above was silent:
 *   - any existing session is signed out before a code is requested, so the
 *     old cookie cannot survive into the new sign-in
 *   - after verifying, the session's email is compared with the one that was
 *     typed, and a mismatch is treated as a failure rather than a success
 */
export default function LoginPage() {
  const t = useTranslations("login");
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "verifying" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const [nonces, setNonces] = useState<{ raw: string; hashed: string } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateNoncePair().then(setNonces);
    if (new URLSearchParams(window.location.search).get("error") === "auth") {
      setLinkError(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !nonces || !GOOGLE_CLIENT_ID || !buttonRef.current || !window.google) return;

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
            setErrorMsg(error.message);
            setStatus("error");
            return;
          }
          window.location.href = safeNext();
        } catch (e: unknown) {
          setErrorMsg(e instanceof Error ? e.message : t("errorUnknown"));
          setStatus("error");
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

  async function requestCode(address: string, resending = false) {
    setStatus("sending");
    setErrorMsg(null);
    setNotice(null);
    try {
      const supabase = createClient();

      // Clear whatever session this browser is holding BEFORE asking for a
      // code. This is the guard that makes signing in as a second person on a
      // shared machine behave the way anyone would expect.
      const { data: existing } = await supabase.auth.getUser();
      const hadOther =
        existing.user?.email && existing.user.email.toLowerCase() !== address.toLowerCase();
      await supabase.auth.signOut();

      // No emailRedirectTo: there is no link to follow. The template carries
      // {{ .Token }} and the member types what it says.
      const { error } = await supabase.auth.signInWithOtp({ email: address });
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }

      setCode("");
      setStep("code");
      setStatus("idle");
      setNotice(resending ? t("code.resent") : hadOther ? t("code.switched") : null);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : t("errorUnknown"));
      setStatus("error");
    }
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    await requestCode(email);
  }

  const verify = useCallback(
    async (token: string) => {
      setStatus("verifying");
      setErrorMsg(null);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "email",
        });

        if (error) {
          setStatus("error");
          setCode("");
          setErrorMsg(
            /expired/i.test(error.message) ? t("code.expired") : t("code.wrong"),
          );
          return;
        }

        // The session that came back must belong to the address that was
        // typed. If it does not, something is wrong in a way that should stop
        // here rather than land somebody on another person's dashboard, which
        // is the exact failure this rewrite exists to end.
        const signedInAs = data.user?.email?.toLowerCase();
        if (!signedInAs || signedInAs !== email.trim().toLowerCase()) {
          await supabase.auth.signOut();
          setStatus("error");
          setCode("");
          setErrorMsg(t("errorFallback"));
          return;
        }

        window.location.href = safeNext();
      } catch (e: unknown) {
        setStatus("error");
        setCode("");
        setErrorMsg(e instanceof Error ? e.message : t("errorUnknown"));
      }
    },
    [email, t],
  );

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <section className="container-px py-20">
        <div className="glass mx-auto max-w-md p-10">
          <span className="pill">{t("pill")}</span>
          <h1 className="serif text-white mt-6 mb-2" style={{ fontSize: 36, fontWeight: 500 }}>
            {step === "code" ? t("code.heading") : t("title")}
          </h1>
          <p className="mb-7 text-[14px] text-gray-2">
            {step === "code" ? t("code.sentTo", { email }) : t("subtitle")}
          </p>

          {linkError && step === "email" && (
            <div
              className="mb-5 rounded-[10px] px-4 py-3 text-[13px] text-gold"
              style={{ background: "rgba(232,160,32,0.12)", border: "1px solid rgba(232,160,32,0.35)" }}
            >
              {t("linkExpired")}
            </div>
          )}

          {!configured ? (
            <div className="glass-tight p-6 text-[13px] leading-relaxed text-gray-2">
              {t("notConfigured")}
            </div>
          ) : step === "code" ? (
            <div className="space-y-5">
              {notice && (
                <div className="flex items-center gap-2 rounded-[10px] px-4 py-3 text-[13px] text-positive"
                  style={{ background: "rgba(74,192,154,0.15)", border: "1px solid rgba(74,192,154,0.35)" }}>
                  <Mail className="h-4 w-4" /> {notice}
                </div>
              )}

              <OtpInput
                value={code}
                onChange={setCode}
                onComplete={verify}
                disabled={status === "verifying"}
                invalid={status === "error"}
                label={t("code.label")}
              />

              {status === "verifying" && (
                <p className="text-[13px] text-gray-2">{t("code.verifying")}</p>
              )}
              {status === "error" && errorMsg && (
                <p className="text-sm text-negative">{errorMsg}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => requestCode(email, true)}
                  disabled={status === "sending" || status === "verifying"}
                  className="text-[11px] uppercase text-gold hover:text-cream disabled:opacity-50"
                  style={{ letterSpacing: "0.16em" }}
                >
                  {status === "sending" ? t("sending") : t("code.resend")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setStatus("idle");
                    setErrorMsg(null);
                    setNotice(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase text-gray-2 hover:text-cream"
                  style={{ letterSpacing: "0.16em" }}
                >
                  <ArrowLeft className="h-3 w-3" /> {t("code.changeEmail")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {GOOGLE_CLIENT_ID ? (
                <div ref={buttonRef} className="flex justify-center" />
              ) : (
                <div className="glass-tight p-4 text-[12px] text-gray-2">
                  {t("googleDisabled")}
                </div>
              )}

              <div
                className="flex items-center gap-3 text-[10px] uppercase text-gray-2"
                style={{ letterSpacing: "0.22em" }}
              >
                <span className="h-px flex-1 bg-white/10" /> {t("or")}{" "}
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <form onSubmit={onEmailSubmit} className="space-y-3">
                <div>
                  <label htmlFor="email" className="field-label">
                    {t("emailLabel")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field"
                    placeholder={t("emailPlaceholder")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="btn-gold w-full disabled:opacity-60"
                >
                  {status === "sending" ? t("sending") : t("submit")}
                </button>
                {status === "error" && (
                  <p className="text-sm text-negative">{errorMsg ?? t("errorFallback")}</p>
                )}
              </form>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
