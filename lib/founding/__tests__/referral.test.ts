// Tests for Block F: founding-invitation referral attribution.
//
// Run: npx tsx lib/founding/__tests__/referral.test.ts
//
// Same shape as the other pure-logic tests: node:assert, non-zero exit on
// failure, no test runner. The logic under test (lib/founding/referral.ts) is
// pure, so nothing here touches a database, a cookie or Next.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FOUNDING_CODE,
  ALLOWED_REFERRAL_CODES,
  REFERRAL_COOKIE,
  isAllowedReferral,
  normalizeReferral,
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

test("normalizeReferral accepts an allowlisted code", () => {
  assert.equal(normalizeReferral("founding"), "founding");
});

test("normalizeReferral is case-insensitive and trims", () => {
  assert.equal(normalizeReferral("  FOUNDING  "), "founding");
  assert.equal(normalizeReferral("Founding"), "founding");
});

test("normalizeReferral rejects anything not on the allowlist", () => {
  assert.equal(normalizeReferral("evil"), null);
  assert.equal(normalizeReferral("founding; drop table"), null);
  assert.equal(normalizeReferral(""), null);
  assert.equal(normalizeReferral("   "), null);
});

test("normalizeReferral rejects non-strings", () => {
  assert.equal(normalizeReferral(null), null);
  assert.equal(normalizeReferral(undefined), null);
  assert.equal(normalizeReferral(42 as unknown), null);
  assert.equal(normalizeReferral({} as unknown), null);
});

// --- referralToPersist (set-once) -------------------------------------------

test("referralToPersist writes an allowlisted code when none is set", () => {
  assert.equal(referralToPersist(null, "founding"), "founding");
  assert.equal(referralToPersist(undefined, "  Founding "), "founding");
});

test("referralToPersist never overwrites an existing attribution", () => {
  assert.equal(referralToPersist("founding", "founding"), null);
  // even if a later, different (allowlisted) code arrives, the first wins
  assert.equal(referralToPersist("founding", "partner-x"), null);
});

test("referralToPersist writes nothing for a missing or bogus cookie", () => {
  assert.equal(referralToPersist(null, null), null);
  assert.equal(referralToPersist(null, undefined), null);
  assert.equal(referralToPersist(null, "evil"), null);
  assert.equal(referralToPersist(null, ""), null);
});

// --- Structural: the store is guarded and attribution-only ------------------

test("the account page persists attribution set-once, scoped to the member", () => {
  const src = readFileSync("app/[locale]/account/page.tsx", "utf8");
  assert.ok(src.includes("referralToPersist"), "account page does not use the set-once helper");
  assert.ok(src.includes("founding/referral"), "account page does not import the referral module");
  assert.ok(src.includes("REFERRAL_COOKIE"), "account page does not read the referral cookie");
  // Set-once at the database layer too: the update is guarded on a null column
  // and scoped to the signed-in member's own row.
  assert.ok(
    /referral_code[^\n]*null/.test(src) && src.includes('.eq("id", user.id)'),
    "account page write is not guarded set-once and scoped to the member",
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
      continue; // file may not exist in every checkout; skip rather than fail
    }
    assert.ok(
      !src.includes("founding/referral") && !src.includes("referral_code"),
      `${file} references referral attribution; it must stay attribution-only`,
    );
  }
});

console.log(`ok   ${passed} founding referral tests passed`);
