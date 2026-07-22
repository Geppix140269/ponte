"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * The six digit sign-in, as one implementation.
 *
 * ---------------------------------------------------------------------------
 * Why a code and not a link, and why the guards below are not optional
 * ---------------------------------------------------------------------------
 * The magic link flow put the session in a redirect: Supabase verified the
 * token and sent the member to /account carrying the result in a URL fragment,
 * and /account is a Server Component with no browser Supabase client on it, so
 * nothing ever read that fragment. The session was never established, the
 * server rendered whatever cookie the browser already held, and a member who
 * signed up on a machine where someone else was signed in landed on the other
 * person's account. Nothing crossed accounts over the wire, but the member was
 * acting as somebody else, and a listing posted then belongs to the wrong name.
 *
 * A code has no redirect and no fragment. It is typed into the surface that
 * asked for it, and verifyOtp establishes the session in that surface's own
 * context, where the browser client is right there to receive it.
 *
 * Two further guards, because the failure above was silent:
 *   - any existing session is signed out before a code is requested, so an old
 *     cookie cannot survive into the new sign-in
 *   - after verifying, the session's email is compared with the one that was
 *     typed, and a mismatch is a failure rather than a success
 *
 * This lives in a hook rather than in the login page because the account gate
 * needs the identical flow inside a modal. Two copies of the above is exactly
 * how one of them quietly loses a guard.
 *
 * The hook returns error KINDS, not sentences. Callers own their own copy, so
 * the gate can say something contextual without this file knowing about i18n.
 */

export type OtpStep = "email" | "code";
export type OtpStatus = "idle" | "sending" | "verifying" | "error";
export type OtpErrorKind = "expired" | "wrong" | "mismatch" | "unknown";

export type OtpNotice =
  /** A different account was signed in on this browser and has been replaced. */
  | "switched"
  /** A fresh code was sent on request. */
  | "resent"
  | null;

export function useOtp({ onVerified }: { onVerified: () => void | Promise<void> }) {
  const [step, setStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<OtpStatus>("idle");
  const [errorKind, setErrorKind] = useState<OtpErrorKind | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [notice, setNotice] = useState<OtpNotice>(null);

  const requestCode = useCallback(
    async (address: string, resending = false) => {
      setStatus("sending");
      setErrorKind(null);
      setErrorDetail(null);
      setNotice(null);
      try {
        const supabase = createClient();

        // Clear whatever session this browser is holding BEFORE asking for a
        // code. This is the guard that makes signing in as a second person on
        // a shared machine behave the way anyone would expect.
        const { data: existing } = await supabase.auth.getUser();
        const hadOther =
          existing.user?.email &&
          existing.user.email.toLowerCase() !== address.trim().toLowerCase();
        await supabase.auth.signOut();

        // No emailRedirectTo: there is no link to follow. Both the magic link
        // and the confirm signup templates carry {{ .Token }}, so a returning
        // member and a first time visitor are both sent a code.
        const { error } = await supabase.auth.signInWithOtp({
          email: address.trim(),
        });
        if (error) {
          setErrorKind("unknown");
          setErrorDetail(error.message);
          setStatus("error");
          return;
        }

        setEmail(address.trim());
        setCode("");
        setStep("code");
        setStatus("idle");
        setNotice(resending ? "resent" : hadOther ? "switched" : null);
      } catch (e: unknown) {
        setErrorKind("unknown");
        setErrorDetail(e instanceof Error ? e.message : null);
        setStatus("error");
      }
    },
    [],
  );

  const verify = useCallback(
    async (token: string) => {
      setStatus("verifying");
      setErrorKind(null);
      setErrorDetail(null);
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
          setErrorKind(/expired/i.test(error.message) ? "expired" : "wrong");
          return;
        }

        // The session that came back must belong to the address that was
        // typed. If it does not, something is wrong in a way that should stop
        // here rather than land somebody on another person's account, which is
        // the exact failure this flow exists to end.
        const signedInAs = data.user?.email?.toLowerCase();
        if (!signedInAs || signedInAs !== email.trim().toLowerCase()) {
          await supabase.auth.signOut();
          setStatus("error");
          setCode("");
          setErrorKind("mismatch");
          return;
        }

        setStatus("idle");
        await onVerified();
      } catch (e: unknown) {
        setStatus("error");
        setCode("");
        setErrorKind("unknown");
        setErrorDetail(e instanceof Error ? e.message : null);
      }
    },
    [email, onVerified],
  );

  const backToEmail = useCallback(() => {
    setStep("email");
    setCode("");
    setStatus("idle");
    setErrorKind(null);
    setErrorDetail(null);
    setNotice(null);
  }, []);

  return {
    step,
    email,
    setEmail,
    code,
    setCode,
    status,
    errorKind,
    errorDetail,
    notice,
    requestCode,
    verify,
    backToEmail,
  };
}
