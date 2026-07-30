import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_AUTH_DESTINATION,
  safeAuthRedirectDestination,
  safeInternalDestination,
} from "../next-destination";

const tests: { name: string; run: () => void }[] = [];
const test = (name: string, run: () => void) => tests.push({ name, run });
const source = (path: string) => readFileSync(path, "utf8");

test("generic auth defaults to opportunities", () => {
  assert.equal(DEFAULT_AUTH_DESTINATION, "/opportunities");
  assert.equal(safeInternalDestination(null), "/opportunities");
  assert.equal(safeInternalDestination(""), "/opportunities");
});

test("valid journey destinations keep their state", () => {
  assert.equal(
    safeInternalDestination("/structure?edit=123#review"),
    "/structure?edit=123#review",
  );
  assert.equal(safeInternalDestination("/find/o/PT-42?from=signal"), "/find/o/PT-42?from=signal");
});

test("external and ambiguous destinations fail closed", () => {
  assert.equal(safeInternalDestination("https://example.com"), "/opportunities");
  assert.equal(safeInternalDestination("//example.com/path"), "/opportunities");
  assert.equal(safeInternalDestination("/\\example.com"), "/opportunities");
  assert.equal(
    safeAuthRedirectDestination("https://ponte.trade/account?tab=business", "https://ponte.trade"),
    "/account?tab=business",
  );
  assert.equal(
    safeAuthRedirectDestination("https://example.com/account", "https://ponte.trade"),
    "/opportunities",
  );
});

test("account is a Desk-only identity surface", () => {
  const account = source("app/[locale]/account/page.tsx");
  assert.match(account, /DeskShell/);
  assert.match(account, /Profile and company/);
  assert.match(account, /Member-business status/);
  assert.match(account, /Sign out/);
  assert.doesNotMatch(account, /marketplace|listings?|credits?/i);

  const chrome = source("components/ChromeGate.tsx");
  assert.match(chrome, /path === "\/account"/);
});

test("join captures attribution and redirects without a page", () => {
  const join = source("app/[locale]/join/route.ts");
  assert.match(join, /REFERRAL_COOKIE/);
  assert.match(join, /NextResponse\.redirect/);
  assert.equal(
    (() => {
      try {
        readFileSync("app/[locale]/join/page.tsx", "utf8");
        return true;
      } catch {
        return false;
      }
    })(),
    false,
  );
});

test("AccountGate runs the captured action once and contains no credit path", () => {
  const gate = source("components/AccountGate.tsx");
  assert.match(gate, /pendingActionRef/);
  assert.match(gate, /if \(ran\.current\) return/);
  assert.match(gate, /await pendingActionRef\.current\(\)/);
  assert.doesNotMatch(gate, /api\/credits|setBalance|credit cost|top.?up|t\("credits"/i);
});

let failed = 0;
for (const { name, run } of tests) {
  try {
    run();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(`     ${(error as Error).message}`);
  }
}

if (failed) {
  console.error(`\n${failed} of ${tests.length} Stage 1 tests failed.`);
  process.exit(1);
}
console.log(`\nAll ${tests.length} Stage 1 tests passed.`);
