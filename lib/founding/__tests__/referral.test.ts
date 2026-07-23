// Tests for Block F: founding-invitation referral attribution.
//
// Run: npx tsx lib/founding/__tests__/referral.test.ts
//
// Pure-logic tests: node:assert, non-zero exit on failure, no test runner. The
// logic under test (lib/founding/referral.ts) is pure, so nothing here touches
// a database, a cookie or Next. The route-level behaviour (cookie consumption,
// retry safety) is proved separately in claim-route.test.ts.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FOUNDING_CODE,
  ALLOWED_REFERRAL_CODES,
  REFERRAL_COOKIE,
  ELIGIBILITY_SKEW_MS,
  isAllowedReferral,
  normalizeReferral,
  parseReferralCookie,
  referralToPersist,
} from "../referral";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const ISSUED = 1_700_000_000_000;
const COOKIE = `${FOUNDING_CODE}.${ISSUED}`;
const AFTER = ISSUED + 5_000; // signed up just after the invitation
const LONG_BEFORE = ISSUED - 400 * 24 * 60 * 60 * 1000; // an established account

// --- The allowlist ----------------------------------------------------------

test("the general founding code is on the allowlist", () => {
  assert.ok(isAllowedReferral(FOUNDING_CODE));
  assert.ok(ALLOWED_REFERRAL_CODES.has("founding"));
});

test("an unknown code is not allowed", () => {
  assert.equal(isAllowedReferral("partner-x"), false);
  assert.equal(isAllowedReferral(""), false);
});

test("the referral cookie name is a stable first-party name", () => {
  assert.equal(REFERRAL_COOKIE, "ponte_ref");
});

// --- normalizeReferral ------------------------------------------------------

test("normalizeReferral accepts an allowlisted code, case-insensitively, trimmed", () => {
  assert.equal(normalizeReferral("founding"), "founding");
  assert.equal(normalizeReferral("  FOUNDING  "), "founding");
});

test("normalizeReferral rejects anything not on the allowlist or non-strings", () => {
  assert.equal(normalizeReferral("evil"), null);
  assert.equal(normalizeReferral("founding; drop table"), null);
  assert.equal(normalizeReferral(""), null);
  assert.equal(normalizeReferral(null), null);
  assert.equal(normalizeReferral(42 as unknown), null);
});

// --- parseReferralCookie ----------------------------------------------------

test("parseReferralCookie reads code and issued-at from a well-formed cookie", () => {
  assert.deepEqual(parseReferralCookie(`founding.${ISSUED}`), {
    code: "founding",
    issuedAt: ISSUED,
  });
  assert.deepEqual(parseReferralCookie(`FOUNDING.${ISSUED}`), {
    code: "founding",
    issuedAt: ISSUED,
  });
});

test("parseReferralCookie rejects a missing timestamp, a bad code or a bad number", () => {
  assert.equal(parseReferralCookie("founding"), null); // no timestamp (legacy)
  assert.equal(parseReferralCookie("evil.1700000000000"), null);
  assert.equal(parseReferralCookie("founding.abc"), null);
  assert.equal(parseReferralCookie("founding."), null);
  assert.equal(parseReferralCookie("founding.0"), null);
  assert.equal(parseReferralCookie(null), null);
});

// --- referralToPersist: set-once + allowlist + new-signup eligibility --------

test("an eligible new signup is attributed", () => {
  assert.equal(referralToPersist(null, COOKIE, AFTER), "founding");
  assert.equal(referralToPersist(undefined, COOKIE, ISSUED), "founding");
});

test("an established profile is never retroactively attributed", () => {
  assert.equal(referralToPersist(null, COOKIE, LONG_BEFORE), null);
});

test("an existing attribution is never overwritten", () => {
  assert.equal(referralToPersist("founding", COOKIE, AFTER), null);
  assert.equal(referralToPersist("founding", COOKIE, LONG_BEFORE), null);
});

test("a missing or bad cookie, or an unknown created-at, attributes nothing", () => {
  assert.equal(referralToPersist(null, null, AFTER), null);
  assert.equal(referralToPersist(null, "founding", AFTER), null); // no timestamp
  assert.equal(referralToPersist(null, `evil.${ISSUED}`, AFTER), null);
  assert.equal(referralToPersist(null, COOKIE, null), null);
  assert.equal(referralToPersist(null, COOKIE, NaN), null);
});

test("clock skew within tolerance still attributes; well before the invitation does not", () => {
  assert.equal(referralToPersist(null, COOKIE, ISSUED - 60_000), "founding"); // 1 min skew
  assert.equal(
    referralToPersist(null, COOKIE, ISSUED - (ELIGIBILITY_SKEW_MS + 60_000)),
    null,
  ); // beyond tolerance
});

// --- Structural: the store lives in the route and is guarded -----------------

test("the claim route is gated, allowlisted, set-once and scoped to the member", () => {
  const src = readFileSync("app/api/founding/claim/route.ts", "utf8");
  assert.ok(src.includes("getUser"), "claim route is not gated on a signed-in user");
  assert.ok(src.includes("referralToPersist"), "claim route does not use the eligibility helper");
  assert.ok(
    /is\(["']referral_code["'],\s*null\)/.test(src),
    "claim route write is not set-once at the database layer",
  );
  assert.ok(src.includes('.eq("id", user.id)'), "claim route write is not scoped to the member");
});

test("the account page no longer writes attribution during render", () => {
  const src = readFileSync("app/[locale]/account/page.tsx", "utf8");
  assert.ok(src.includes("ClaimReferral"), "account page does not mount the claim trigger");
  assert.ok(
    !src.includes("referralToPersist") && !src.includes(".update({ referral_code"),
    "account page still writes attribution during render",
  );
});

test("referral attribution is never imported by auth, verification or payment code", () => {
  const forbidden = [
    "app/auth/callback/route.ts",
    "app/auth/confirm/route.ts",
    "app/api/webhooks/stripe/route.ts",
    "app/api/verification/route.ts",
    "supabase/migrations/20260722e_handle_new_user_search_path.sql",
  ];
  for (const file of forbidden) {
    let src = "";
    try {
      src = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    assert.ok(
      !src.includes("founding/referral") && !src.includes("referral_code"),
      `${file} references referral attribution; it must stay attribution-only`,
    );
  }
});

console.log(`ok   ${passed} founding referral tests passed`);
