// The commercial boundary test for Issue #135 / ADR-0018.
//
// Run: npx tsx lib/verification/__tests__/member-business-free.test.ts
//
// It pins one durable property: verifying the member's OWN business is FREE.
// The member_business path must never read a balance, spend a credit, write a
// ledger row, refund one, or answer 402. A counterparty_check keeps its paid
// rule, and that separation must survive every later edit.
//
// SOURCE-LEVEL, AND ONLY HALF THE PROOF.
//
// This file reads the pipeline, the route, the page and the form and pins the
// readable SHAPE of the guards: `paidPurpose`, the `purpose !== "member_business"`
// block around the balance read and the 402, the isPaid branch in the UI. That
// shape is what a reviewer checks by eye, and keeping it stable is worth a test
// of its own.
//
// It does NOT prove behaviour. Every assertion below is a string or regex over
// source text, so it would still pass if a spend moved above its guard, reached
// the ledger through a helper module, or kept its spelling while changing its
// runtime meaning.
//
// PAIRED WITH lib/verification/__tests__/member-business-free-runtime.test.ts,
// added in cutover PR 6. That file EXECUTES the pipeline and the route against
// a recording double for @/lib/credits and asserts that a member_business run
// reaches no credit function at all. Read the two together: shape here,
// behaviour there. The runtime file also records one path where the boundary
// does not hold, which this file cannot see.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

const pipeline = readFileSync("lib/verification/pipeline.ts", "utf8");
const api = readFileSync("app/api/verification/route.ts", "utf8");
const page = readFileSync("app/[locale]/verify/page.tsx", "utf8");
const form = readFileSync("components/VerifyForm.tsx", "utf8");

/** Strip comments so prose about credits is never mistaken for a call. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// --- The pipeline: the one place a credit is spent -------------------------

test("the pipeline computes the purpose before it decides to charge", () => {
  const c = code(pipeline);
  const purposeAt = c.indexOf("normalizePurpose(req.purpose)");
  const spendAt = c.indexOf("spendCredits(");
  assert.ok(purposeAt > -1, "the pipeline no longer normalises the purpose");
  assert.ok(spendAt > -1, "the pipeline no longer contains the spend call");
  assert.ok(
    purposeAt < spendAt,
    "the purpose must be known before the charge, or a free run could be billed",
  );
});

test("the only spendCredits call is guarded by a non-member-business purpose", () => {
  const c = code(pipeline);
  const calls = c.split("spendCredits(").length - 1;
  // One import mention plus one call site; the call must sit under the guard.
  assert.ok(calls >= 1, "the spend call vanished; this test must be revisited");
  assert.ok(
    /const\s+paidPurpose\s*=\s*purpose\s*!==\s*["']member_business["']/.test(c),
    "the pipeline no longer derives paidPurpose from the purpose",
  );
  assert.ok(
    /if\s*\(\s*paidPurpose\s*&&\s*req\.userId\s*\)\s*\{[\s\S]*?spendCredits\(/.test(c),
    "spendCredits is not guarded by paidPurpose: a member-business run could be charged",
  );
});

test("a free run writes no credit ledger reference", () => {
  const c = code(pipeline);
  assert.ok(
    /if\s*\(\s*paidPurpose\s*\)\s*\{[\s\S]*?credit_ledger_id/.test(c),
    "the credit_ledger_id write is not guarded by paidPurpose",
  );
});

// --- The API: 402 is unreachable for a member-business request -------------

test("the balance read and 402 are guarded by the purpose", () => {
  const c = code(api);
  assert.ok(
    /if\s*\(\s*purpose\s*!==\s*["']member_business["']\s*\)\s*\{[\s\S]*?getBalance\(/.test(c),
    "getBalance is not guarded: a member-business request still reads a balance",
  );
  const guardAt = c.indexOf('purpose !== "member_business"');
  const balanceAt = c.indexOf("getBalance(");
  const status402 = c.indexOf("402");
  assert.ok(guardAt > -1 && guardAt < balanceAt, "the balance read is not inside the paid guard");
  assert.ok(guardAt < status402, "the 402 reply is not inside the paid guard");
});

test("the purpose is resolved before any payment decision in the API", () => {
  const c = code(api);
  assert.ok(
    c.indexOf("normalizePurpose(body.purpose)") < c.indexOf("getBalance("),
    "the API reads a balance before it knows the purpose",
  );
});

// --- The page and the form: no cost surface on the free path ---------------

test("the verify page reads a balance only for the paid counterparty check", () => {
  const c = code(page);
  assert.ok(
    /const\s+isPaid\s*=\s*mode\s*===\s*["']counterparty_check["']/.test(c),
    "the page no longer distinguishes the paid path",
  );
  assert.ok(
    /if\s*\(\s*user\s*&&\s*isPaid\s*\)/.test(c),
    "the page still reads a balance regardless of purpose",
  );
  assert.ok(
    /cost=\{\s*isPaid\s*\?\s*COST_VERIFICATION_L2\s*:\s*null\s*\}/.test(c),
    "the page still passes a cost on the free path",
  );
});

test("the form renders no balance, cost, shortfall or top-up when the check is free", () => {
  const c = code(form);
  assert.ok(/cost:\s*number\s*\|\s*null/.test(c), "cost is not nullable, so free cannot be expressed");
  assert.ok(/const\s+isPaid\s*=\s*cost\s*!==\s*null/.test(c), "the form no longer derives isPaid");
  assert.ok(
    /const\s+short\s*=\s*isPaid\s*&&/.test(c),
    "the shortfall can still fire on a free check",
  );
  // The balance block, the shortfall block and the top-up link all sit inside
  // the isPaid branch.
  const paidBranch = c.indexOf("{isPaid ? (");
  const elseBranch = c.indexOf("} ) : (", paidBranch) > -1 ? c.indexOf("} ) : (", paidBranch) : c.indexOf(") : (", paidBranch);
  assert.ok(paidBranch > -1, "the form no longer branches on isPaid");
  const paidOnly = c.slice(paidBranch, elseBranch > -1 ? elseBranch : undefined);
  for (const hook of ["vbal__l", "vbal__c", "request.balance.short", "request.balance.topUp"]) {
    assert.ok(paidOnly.includes(hook), `${hook} escaped the paid-only branch`);
  }
});

// --- The two purposes stay commercially separate ---------------------------

test("the counterparty check keeps its paid rule", () => {
  const c = code(api);
  assert.ok(c.includes("getBalance("), "the paid path lost its balance check entirely");
  assert.ok(c.includes("402"), "the paid path lost its 402 reply");
  const p = code(pipeline);
  assert.ok(p.includes("spendCredits("), "the paid path lost its spend");
  assert.ok(p.includes("InsufficientCredits"), "the paid path lost its insufficient-credit handling");
});

console.log(`ok   ${passed} member-business credit-free tests passed`);
