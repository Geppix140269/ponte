// Tests for the shared auth destination helper (Issue #130 Stage 1, controller
// amendment) and the Stage 1 wiring that depends on it.
//
// Run: npx tsx lib/auth/__tests__/next-destination.test.ts
//
// The helper (lib/auth/next-destination.ts) is pure, so the logic tests touch
// no window, no next/server and no cookies. The contract tests read the three
// sign-in exits and the account control by source, the same shape the founding
// referral tests use, so a regression that re-inlines an ad hoc sanitiser or
// re-points the account control fails here first.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_DESTINATION,
  safeNextPath,
  safeRedirectTo,
} from "../next-destination";

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

const ORIGIN = "https://ponte.example";

// Control characters are built at runtime so the source file itself carries
// none (the encoding gate forbids NUL and other control bytes in tracked text).
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const TAB = String.fromCharCode(9);
const NUL = String.fromCharCode(0);

// --- the default -------------------------------------------------------------

test("the generic destination is /opportunities", () => {
  assert.equal(DEFAULT_DESTINATION, "/opportunities");
});

test("a missing, empty or non-string target falls back to the default", () => {
  assert.equal(safeNextPath(null), "/opportunities");
  assert.equal(safeNextPath(undefined), "/opportunities");
  assert.equal(safeNextPath(""), "/opportunities");
  assert.equal(safeNextPath(42 as unknown as string), "/opportunities");
});

// --- safeNextPath: a valid same-site path is preserved whole -----------------

test("a plain same-site path is preserved", () => {
  assert.equal(safeNextPath("/opportunities"), "/opportunities");
  assert.equal(safeNextPath("/find/o/PT-1234"), "/find/o/PT-1234");
});

test("query and hash on a same-site path are preserved", () => {
  assert.equal(safeNextPath("/find?q=steel&role=buyer"), "/find?q=steel&role=buyer");
  assert.equal(safeNextPath("/market-signals/42#evidence"), "/market-signals/42#evidence");
  assert.equal(safeNextPath("/find?q=a#b"), "/find?q=a#b");
});

// --- safeNextPath: everything a browser could resolve off-origin is rejected -

test("a protocol-relative target is rejected", () => {
  assert.equal(safeNextPath("//evil.example"), "/opportunities");
  assert.equal(safeNextPath("//evil.example/opportunities"), "/opportunities");
});

test("a backslash trick is rejected", () => {
  assert.equal(safeNextPath("/\\evil.example"), "/opportunities"); // /\evil.example
  assert.equal(safeNextPath("/\\/evil.example"), "/opportunities"); // /\/evil.example
  assert.equal(safeNextPath("\\\\evil.example"), "/opportunities"); // \\evil.example
  assert.equal(safeNextPath("/find\\..\\admin"), "/opportunities"); // backslash mid-path
});

test("an absolute or scheme-bearing target is rejected", () => {
  assert.equal(safeNextPath("https://evil.example/opportunities"), "/opportunities");
  assert.equal(safeNextPath("http://evil.example"), "/opportunities");
  assert.equal(safeNextPath("javascript:alert(1)"), "/opportunities");
  assert.equal(safeNextPath("mailto:x@y.z"), "/opportunities");
});

test("a relative or malformed target is rejected", () => {
  assert.equal(safeNextPath("opportunities"), "/opportunities"); // no leading slash
  assert.equal(safeNextPath("../admin"), "/opportunities");
});

test("a control character, including CR/LF header smuggling, is rejected", () => {
  assert.equal(safeNextPath(`/find${CR}${LF}Set-Cookie: x=1`), "/opportunities");
  assert.equal(safeNextPath(`/find${TAB}x`), "/opportunities");
  assert.equal(safeNextPath(`/find${NUL}`), "/opportunities");
});

// --- safeRedirectTo: also accepts a same-ORIGIN absolute URL -----------------

test("a same-site path passes safeRedirectTo unchanged", () => {
  assert.equal(safeRedirectTo("/account", ORIGIN), "/account");
  assert.equal(safeRedirectTo("/find?q=a#b", ORIGIN), "/find?q=a#b");
});

test("a same-origin absolute URL is reduced to its path, query and hash", () => {
  assert.equal(safeRedirectTo(`${ORIGIN}/account`, ORIGIN), "/account");
  assert.equal(safeRedirectTo(`${ORIGIN}/find?q=steel#x`, ORIGIN), "/find?q=steel#x");
  assert.equal(safeRedirectTo(ORIGIN, ORIGIN), "/"); // bare origin -> root
});

test("a foreign-origin absolute URL is rejected", () => {
  assert.equal(safeRedirectTo("https://evil.example/account", ORIGIN), "/opportunities");
  assert.equal(safeRedirectTo("https://ponte.example.evil.com/x", ORIGIN), "/opportunities");
});

test("a protocol-relative, malformed or missing redirect_to falls back", () => {
  assert.equal(safeRedirectTo("//evil.example", ORIGIN), "/opportunities");
  assert.equal(safeRedirectTo("not a url", ORIGIN), "/opportunities");
  assert.equal(safeRedirectTo(null, ORIGIN), "/opportunities");
  assert.equal(safeRedirectTo("", ORIGIN), "/opportunities");
});

// --- Stage 1 contracts: the three sign-in exits use the one helper -----------

test("DeskLoginForm defers to the shared helper", () => {
  const src = readFileSync("components/desk/DeskLoginForm.tsx", "utf8");
  assert.ok(src.includes("next-destination"), "DeskLoginForm does not import the shared helper");
  assert.ok(src.includes("safeNextPath"), "DeskLoginForm does not call safeNextPath");
  assert.ok(
    !src.includes('startsWith("//")'),
    "DeskLoginForm still carries an inline sanitiser instead of the shared helper",
  );
});

test("the auth callback route defers to the shared helper", () => {
  const src = readFileSync("app/auth/callback/route.ts", "utf8");
  assert.ok(src.includes("safeNextPath"), "callback route does not call safeNextPath");
  assert.ok(
    !src.includes('"/account"'),
    "callback route still hardcodes an /account fallback",
  );
});

test("the auth confirm route defers to the shared helper for redirect_to", () => {
  const src = readFileSync("app/auth/confirm/route.ts", "utf8");
  assert.ok(src.includes("safeRedirectTo"), "confirm route does not call safeRedirectTo");
  assert.ok(
    !src.includes('let next = "/account"'),
    "confirm route still hardcodes an /account fallback",
  );
});

// --- Stage 1 contract: the account control opens the account -----------------

test("the signed-in Desk account control opens /account", () => {
  const src = readFileSync("components/desk/DeskAccount.tsx", "utf8");
  assert.ok(
    /href="\/account"/.test(src),
    "the signed-in account control does not link to /account",
  );
});

console.log(`ok   ${passed} auth next-destination tests passed`);
