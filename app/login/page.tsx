"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

// Where to send the user after sign-in. Only same-site paths are allowed.
function safeNext(): string {
  if (typeof window === "undefined") return "/account";
  const raw = new URLSearchParams(window.location.search).get("next") || "/account";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
}

// Generate a random nonce + its SHA-256 hash. Google receives the hash;
// Supabase verifies the raw nonce matches the hash in the returned ID token.
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [nonces, setNonces] = useState<{ raw: string; hashed: string } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Step 1: generate the nonce pair once on mount.
  useEffect(() => {
    generateNoncePair().then(setNonces);
  }, []);

  // Step 2: once the GSI script is loaded AND we have a nonce, init + render.
  useEffect(() => {
    if (!scriptLoaded || !nonces || !GOOGLE_CLIENT_ID || !buttonRef.current || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce: nonces.hashed,
      use_fedcm_for_prompt: true,
      callback: async (response) => {
        try {
          const supabase = createClient();
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
          setErrorMsg(e instanceof Error ? e.message : "Unknown error");
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
    });
  }, [scriptLoaded, nonces]);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext())}`,
        },
      });
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
      } else {
        setStatus("sent");
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} />
      <section className="container-px py-20">
        <div className="glass p-10 max-w-md mx-auto">
          <span className="pill">Sign in</span>
          <h1 className="serif text-white mt-6 mb-2" style={{ fontSize: 36, fontWeight: 500 }}>Welcome back.</h1>
          <p className="text-gray-2 text-[14px] mb-7">Access your orders, downloads, and subscriptions.</p>

          {!configured ? (
            <div className="glass-tight p-6 text-[13px] text-gray-2 leading-relaxed">
              Sign-in becomes available once Supabase Auth is connected. Add your Supabase keys to enable magic-link and Google login.
            </div>
          ) : status === "sent" ? (
            <div className="flex items-center gap-2 rounded-[10px] px-4 py-3 text-[13px] text-positive" style={{ background: "rgba(74,192,154,0.15)", border: "1px solid rgba(74,192,154,0.35)" }}>
              <Mail className="h-4 w-4" /> Check your inbox for a magic sign-in link.
            </div>
          ) : (
            <div className="space-y-5">
              {GOOGLE_CLIENT_ID ? (
                <div ref={buttonRef} className="flex justify-center" />
              ) : (
                <div className="glass-tight p-4 text-[12px] text-gray-2">Google sign-in disabled (no client ID configured).</div>
              )}

              <div className="flex items-center gap-3 text-[10px] uppercase text-gray-2" style={{ letterSpacing: "0.22em" }}>
                <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
              </div>

              <form onSubmit={signInWithEmail} className="space-y-3">
                <div>
                  <label htmlFor="email" className="field-label">Email address</label>
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@company.com" />
                </div>
                <button type="submit" disabled={status === "sending"} className="btn-gold w-full disabled:opacity-60">
                  {status === "sending" ? "Sending..." : "Email me a magic link"}
                </button>
                {status === "error" && (
                  <p className="text-sm text-negative">{errorMsg ?? "Something went wrong. Try again."}</p>
                )}
              </form>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
