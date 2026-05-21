"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setStatus(error ? "error" : "sent");
    } catch {
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
    <section className="bg-white py-20">
      <div className="container-px max-w-md">
        <h1 className="text-3xl font-extrabold">Sign in</h1>
        <p className="mt-2 text-navy/60">
          Access your orders, downloads, and subscriptions.
        </p>

        {!configured ? (
          <div className="mt-8 rounded-xl border border-line bg-mist p-6 text-sm text-navy/70">
            Sign-in becomes available once Supabase Auth is connected. Add your
            Supabase keys to enable magic-link and Google login.
          </div>
        ) : status === "sent" ? (
          <div className="mt-8 flex items-center gap-2 rounded-xl border border-line bg-emerald-50 p-6 text-sm font-semibold text-emerald-700">
            <Mail className="h-4 w-4" /> Check your inbox for a magic sign-in link.
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="btn-outline w-full"
            >
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-xs text-navy/40">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={signInWithEmail} className="space-y-3">
              <div>
                <label htmlFor="email" className="field-label">Email address</label>
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
                <p className="text-sm text-red-600">Something went wrong. Try again.</p>
              )}
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
