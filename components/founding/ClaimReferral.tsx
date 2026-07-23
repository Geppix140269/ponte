"use client";

import { useEffect, useRef } from "react";
import { REFERRAL_COOKIE } from "@/lib/founding/referral";

/**
 * Fires the founding-attribution claim once, from the account page (brief
 * Block F, attribution-integrity correction).
 *
 * It only calls the route when the referral cookie is actually present, so a
 * normal member with no invitation makes no request. On a successful claim the
 * route clears the cookie, so later visits do nothing; on a failure the cookie
 * stays and a later visit retries. A per-session guard stops repeat calls
 * within one session while an ineligible cookie lingers.
 */
export default function ClaimReferral() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    const hasCookie = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${REFERRAL_COOKIE}=`));
    if (!hasCookie) return;
    if (sessionStorage.getItem("ponte_ref_claimed") === "1") return;

    fired.current = true;
    sessionStorage.setItem("ponte_ref_claimed", "1");
    fetch("/api/founding/claim", { method: "POST" }).catch(() => {
      // Attribution is best-effort; a failure just leaves the cookie for a
      // later retry (a new session clears the per-session guard).
    });
  }, []);

  return null;
}
