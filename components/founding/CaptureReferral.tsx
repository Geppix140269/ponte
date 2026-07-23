"use client";

import { useEffect } from "react";
import {
  FOUNDING_CODE,
  REFERRAL_COOKIE,
  REFERRAL_MAX_AGE_DAYS,
  normalizeReferral,
} from "@/lib/founding/referral";

/**
 * Captures the founding-invitation attribution, once, at first entry (brief
 * Block F). Mounted only on /join, the single general Founding Network URL.
 *
 * It writes a first-party cookie carrying an allowlisted code and the moment of
 * capture, `<code>.<issuedAtMs>`. The account page later persists the code to
 * the member profile exactly once, and only when the account was created at or
 * after that moment, so an established member visiting /join is never
 * retroactively attributed. The value is attribution only: it is never a secret
 * and never grants anything, so a plain (non-httpOnly) cookie is the right
 * tool. "Once" means first touch wins, so an existing cookie is left untouched
 * and a later /join visit cannot overwrite an earlier capture. A non-allowlisted
 * `?ref` falls back to the general founding code rather than storing an
 * arbitrary value.
 */
export default function CaptureReferral() {
  useEffect(() => {
    const already = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${REFERRAL_COOKIE}=`));
    if (already) return;

    const raw = new URLSearchParams(window.location.search).get("ref");
    const code = normalizeReferral(raw) ?? FOUNDING_CODE;
    const value = `${code}.${Date.now()}`;
    const maxAge = REFERRAL_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${REFERRAL_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
  }, []);

  return null;
}
