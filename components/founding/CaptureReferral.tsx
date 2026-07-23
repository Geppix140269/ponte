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
 * It writes a first-party cookie carrying an allowlisted code, which the
 * account page later persists to the member profile exactly once. The value is
 * attribution only: it is never a secret and never grants anything, so a plain
 * (non-httpOnly) cookie is the right tool. "Once" means first touch wins, so an
 * existing cookie is left untouched and a later /join visit cannot overwrite an
 * earlier attribution. A non-allowlisted `?ref` falls back to the general
 * founding code rather than storing an arbitrary value.
 */
export default function CaptureReferral() {
  useEffect(() => {
    const already = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${REFERRAL_COOKIE}=`));
    if (already) return;

    const raw = new URLSearchParams(window.location.search).get("ref");
    const code = normalizeReferral(raw) ?? FOUNDING_CODE;
    const maxAge = REFERRAL_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${REFERRAL_COOKIE}=${code}; path=/; max-age=${maxAge}; samesite=lax`;
  }, []);

  return null;
}
