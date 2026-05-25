"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
      } else setStatus("sent");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Unknown error");
      setStatus("error");
    }
  }

  async function signInWithGoogle() {
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="container-px py-20">
      <div className="glass p-10 max-w-md mx-auto">
        <span className="pill">Sign in</span>
        <h1
          className="serif text-white mt-6 mb-2"
          style={{ fontSize: 36, fontWeight: 500 }}
        >
          Welcome back.
        </h1>
        <p className="text-gray-2 text-[14px] mb-7">
          Access your orders, downloads, and subscriptions.
        </p>

        {!configured ? (
          <div className="glass-tight p-6 text-[13px] text-gray-2 leading-relaxed">
            Sign-in becomes available once Supabase Auth is connected. Add
            your Supabase keys to enable magic-link and Google login.
          </div>
        ) : status === "sent" ? (
          <div
            className="flex items-center gap-2 rounded-[10px] px-4 py-3 text-[13px] text-positive"
            style={{
              background: "rgba(74,192,154,0.15)",
              border: "1px solid rgba(74,192,154,0.35)",
            }}
          >
            <Mail className="h-4 w-4" /> Check your inbox for a magic sign-in
            link.
          </div>
        ) : (
          <div className="space-y-5">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="btn-ghost-light w-full"
            >
              Continue with Google
            </button>

            <div
              className="flex items-center gap-3 text-[10px] uppercase text-gray-2"
              style={{ letterSpacing: "0.22em" }}
            >
              <span className="h-px flex-1 bg-white/10" /> or{" "}
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={signInWithEmail} className="space-y-3">
              <div>
                <label htmlFor="email" className="field-label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  placeholder="you@company.com"
                />
              </div>
              <button
                type="submit"
                disabled={status === "sending"}
                className="btn-gold w-full disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Email me a magic link"}
              </button>
              {status === "error" && (
                <p className="text-sm text-negative">
                  {errorMsg ?? "Something went wrong. Try again."}
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
