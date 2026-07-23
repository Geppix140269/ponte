import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { REFERRAL_COOKIE, referralToPersist } from "@/lib/founding/referral";

export const dynamic = "force-dynamic";

/**
 * Records founding-invitation attribution once, for a genuinely new signup
 * (brief Block F, attribution-integrity correction).
 *
 * The store lives here, not in the account render, for two reasons the render
 * could not satisfy: a route handler can clear the referral cookie after a
 * successful write, and it can do so without ever touching the account page's
 * failure-safe rendering.
 *
 * The guards, in order:
 *   - a signed-in member and a cookie are required, else there is nothing to do
 *     and nothing to clear;
 *   - an already-attributed member is never overwritten, and the cookie is
 *     consumed so it cannot attribute a later account on the same browser;
 *   - referralToPersist enforces the allowlist and the new-signup rule (the
 *     account must have been created at or after the invitation was captured),
 *     so an established profile is never retroactively attributed;
 *   - the write is atomic and set-once at the database layer (guarded on a null
 *     column, scoped to the member's own row);
 *   - the cookie is consumed only after persistence succeeds; a failure leaves
 *     it in place so a later visit can retry.
 *
 * The code is attribution only and is never read for authorisation,
 * verification currency, badge eligibility or payment.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function clearCookie(jar: any): void {
  jar.set(REFERRAL_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function POST() {
  const user = await getUser();
  const jar = cookies();
  const raw = jar.get(REFERRAL_COOKIE)?.value ?? null;

  if (!user || !raw) {
    return NextResponse.json({ ok: true, attributed: false });
  }

  const adminSb = createAdminClient();
  const { data: profile } = await adminSb
    .from("profiles")
    .select("referral_code, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // Already attributed: consume the cookie, never overwrite.
  if (profile?.referral_code) {
    clearCookie(jar);
    return NextResponse.json({ ok: true, attributed: false, already: true });
  }

  const createdAtMs = profile?.created_at ? Date.parse(profile.created_at as string) : NaN;
  const code = referralToPersist(profile?.referral_code ?? null, raw, createdAtMs);
  if (!code) {
    // Ineligible (an established profile) or a bad cookie. Leave the cookie: it
    // grants nothing, and it may still attribute a genuinely new signup here.
    return NextResponse.json({ ok: true, attributed: false, eligible: false });
  }

  const { data: updated, error } = await adminSb
    .from("profiles")
    .update({ referral_code: code })
    .eq("id", user.id)
    .is("referral_code", null)
    .select("id");

  if (error) {
    // Do NOT clear the cookie, so a later visit can retry.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Settled (this request wrote it, or a concurrent one already did). Consume.
  clearCookie(jar);
  return NextResponse.json({
    ok: true,
    attributed: (updated?.length ?? 0) > 0,
    code,
  });
}
