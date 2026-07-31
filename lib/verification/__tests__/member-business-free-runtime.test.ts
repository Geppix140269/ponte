// The RUNTIME proof of the commercial boundary in ADR-0018 (Issue #135):
// a member_business verification cannot call a credit function.
//
// Run: npx tsx --tsconfig tsconfig.test.json \
//        lib/verification/__tests__/member-business-free-runtime.test.ts
//
// PAIRED WITH lib/verification/__tests__/member-business-free.test.ts.
// That file reads the source of the pipeline, the route, the page and the form
// and pins the readable SHAPE of the guards: `paidPurpose`, the
// `purpose !== "member_business"` block around the balance read and the 402,
// the isPaid branch in the UI. It is what a reviewer checks by eye, and it is
// worth keeping. What it CANNOT prove is behaviour: it would still pass if a
// spend moved above its guard, reached the ledger through a helper module, or
// kept its spelling while changing its runtime meaning.
//
// This file proves the behaviour instead. It executes the real pipeline and the
// real route handler against test doubles (tsconfig.test.json remaps
// @/lib/credits, @/lib/supabase/server, @/lib/supabase/admin, @/lib/ai,
// @/lib/registry, @/lib/auth, @/lib/rate-limit and next/server). The credits
// double records EVERY function call by name and argument, so "no credit
// function was reached" is an observation, not a reading.
//
// WHY THE COUNTERPARTY CASES ARE HERE. A harness that silently failed to
// intercept @/lib/credits would make every zero-call assertion pass for the
// wrong reason. So the same harness is required to SEE a real spend on the paid
// path, and to see a real 402. Without those, the zero-call assertion would be
// unfalsifiable and therefore worthless.
//
// WHAT IT DOES NOT PROVE. The upstreams are doubles: no registry, sanctions
// database or model is contacted. That is deliberate, and it is not a gap in
// the money proof: money never leaves lib/credits, and lib/credits is the module
// being watched.
//
// WHAT IT FOUND. One real breach of ADR-0018, on the failure path: the refund at
// the bottom of `runLevel2Checks` was guarded by `if (userId)` and not by the
// purpose, so a free run whose checks threw was given two credits back for a
// verification that never paid. The boundary held on every path a member
// normally takes and broke when the checks threw. That is the whole argument for
// running the code rather than reading it. The refund now carries the same
// purpose guard as the spend, and section 1b below is the assertion that keeps
// it there.

/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";

import { __reset, callsFor, rpcCallsFor } from "../../__mocks__/supabase-server";
import {
  __resetCredits,
  __creditCalls,
  __creditFunctionsCalled,
  COST_VERIFICATION_L2,
} from "../../__mocks__/credits";
import { __resetAi, aiCalls } from "../../__mocks__/ai";
import { __resetRegistry, __registryThrows, registryLookups } from "../../__mocks__/registry";
import { __setUser } from "../../__mocks__/auth";

import { runLevel2 } from "../pipeline";
import { POST } from "../../../app/api/verification/route";

const tests: { name: string; fn: () => Promise<void> }[] = [];
function test(name: string, fn: () => Promise<void>): void {
  tests.push({ name, fn });
}

const USER = "11111111-1111-1111-1111-111111111111";
const VERIFICATION_ID = "22222222-2222-2222-2222-222222222222";

/** A registry answer that identifies the company cleanly, so the run can pass. */
const CLEAN_REGISTRY = {
  source: "mock_registry",
  available: true,
  status: "active",
  companyName: "Harbor Trading Ltd",
  regNumber: "12345678",
  incorporationDate: "2012-04-01",
  officers: [{ name: "Anna Ricci", role: "director" }],
  checkedAt: "2026-01-01T00:00:00.000Z",
};

const SUBJECT = {
  name: "Harbor Trading Ltd",
  country: "GB",
  regNumber: "12345678",
  vat: null,
  lei: null,
};

/**
 * One clean world per test: an empty database that accepts the writes, no
 * sanctions rows, a model that suggests a pass, and a credits double with
 * nothing recorded yet.
 */
function stage(opts: { balance?: number; insufficient?: boolean } = {}): void {
  __reset({
    responses: {
      "verifications:insert": { data: { id: VERIFICATION_ID }, error: null },
      "verifications:update": { error: null },
      "trust_score_components:upsert": { error: null },
      "profiles:update": { error: null },
    },
    rpc: { sanctions_match: { data: [], error: null } },
  });
  __resetCredits({ balance: opts.balance ?? 0, insufficient: opts.insufficient });
  __resetAi({
    verdict_suggestion: "auto_verified",
    checks: [],
    flags: [],
    summary_text: "Registry active, details match, nothing on the lists.",
  });
  __registryThrows(null);
  __resetRegistry(CLEAN_REGISTRY);
}

function req(body: any) {
  return { json: async () => body } as any;
}

/** Every recorded credit call, rendered for a failure message. */
function creditCallSummary(): string {
  return __creditCalls()
    .map((c) => `${c.fn}(${c.args.map((a) => JSON.stringify(a)).join(", ")})`)
    .join("; ");
}

// ---------------------------------------------------------------------------
// 1. The free path: zero credit calls, and real work all the same.
// ---------------------------------------------------------------------------

test("a member_business run reaches no credit function at all", async () => {
  stage();

  const outcome = await runLevel2({
    ...SUBJECT,
    userId: USER,
    purpose: "member_business",
    attested: true,
  });

  // The money assertion: not just spendCredits, the WHOLE credit surface.
  assert.deepEqual(
    __creditFunctionsCalled(),
    [],
    `a free member-business run reached a credit function: ${creditCallSummary()}`,
  );
  assert.equal(__creditCalls().length, 0, "no credit call of any kind may be recorded");

  // The run must have actually happened. A zero-call assertion on a run that
  // died at the first line would prove nothing, so the non-credit work is
  // asserted positively.
  assert.equal(outcome.status, "auto_verified", "the free run still reaches a verdict");
  assert.equal(outcome.id, VERIFICATION_ID, "the free run opened a real case");
  assert.equal(registryLookups.length, 1, "the registry was checked");
  assert.equal(rpcCallsFor("sanctions_match").length >= 1, true, "the subject was screened");
  assert.equal(aiCalls.length, 1, "reconciliation ran");
  assert.equal(aiCalls[0].feature, "verification_reconcile");

  // And the free case is recorded as a member-business case, attested.
  const inserts = callsFor("verifications", "insert");
  assert.equal(inserts.length, 1, "exactly one verification row");
  assert.equal(inserts[0].payload.purpose, "member_business");
  assert.ok(inserts[0].payload.attested_at, "the attestation is stamped by the server clock");

  // The verdict was written, and the member's own account moved.
  const updates = callsFor("verifications", "update");
  assert.ok(
    updates.some((u) => u.payload?.status === "auto_verified"),
    "the verdict was written to the case",
  );
  assert.equal(
    callsFor("trust_score_components", "upsert").length >= 2,
    true,
    "the member's trust components were granted",
  );
  assert.equal(callsFor("profiles", "update").length, 1, "the member was badged");

  // No payment record on a free case.
  assert.equal(
    updates.filter((u) => u.payload && "credit_ledger_id" in u.payload).length,
    0,
    "a free case must not write a credit_ledger_id",
  );
});

test("a member_business run whose checks pause for a company choice still touches no credit function", async () => {
  stage();
  // Several companies carry the name and no number identifies the subject, so
  // the run pauses. A paused run is the case a resume finishes for free.
  __resetRegistry({
    source: "mock_registry",
    available: false,
    reason: "3 companies match that name",
    candidates: [
      { companyName: "Harbor Trading Ltd", regNumber: "12345678" },
      { companyName: "Harbor Trading SRL", regNumber: "87654321" },
      { companyName: "Harbor Trading GmbH", regNumber: "55555555" },
    ],
    candidateTotal: 3,
    checkedAt: "2026-01-01T00:00:00.000Z",
  });

  const outcome = await runLevel2({
    ...SUBJECT,
    regNumber: null,
    userId: USER,
    purpose: "member_business",
    attested: true,
  });

  assert.equal(outcome.status, "needs_selection", "the run paused on the choice");
  assert.equal(outcome.candidates?.length, 3, "the candidates travelled back");
  assert.deepEqual(
    __creditFunctionsCalled(),
    [],
    `the paused free run reached a credit function: ${creditCallSummary()}`,
  );
});

test("a member_business run refused for a missing attestation spends nothing and opens nothing", async () => {
  stage();

  const outcome = await runLevel2({
    ...SUBJECT,
    userId: USER,
    purpose: "member_business",
    attested: false,
  });

  assert.equal(outcome.status, "failed");
  assert.equal(callsFor("verifications", "insert").length, 0, "no case is opened");
  assert.deepEqual(__creditFunctionsCalled(), [], creditCallSummary());
});

// ---------------------------------------------------------------------------
// 1b. The failure path, which is where this file found a real breach.
// ---------------------------------------------------------------------------
//
// The refund at the bottom of `runLevel2Checks` used to be guarded by
// `if (userId)` and nothing else, so a free member-business run that died on an
// upstream fault called `refundSpend(userId, COST_VERIFICATION_L2, id)` and
// granted the member two credits back for a verification that never paid for
// anything. The source-reading companion test could not see it: every one of its
// pipeline assertions is about `runLevel2`, and the refund lives in
// `runLevel2Checks`, which the commercial boundary of Issue #135 never touched.
//
// The refund now carries the same purpose guard the spend carries, and this test
// is the zero-call assertion that holds it there. The paired test below proves
// the guard did not simply switch the refund off for everyone.
test("a member_business run whose checks throw reaches no credit function either", async () => {
  stage();
  __registryThrows("registry upstream is down");

  const outcome = await runLevel2({
    ...SUBJECT,
    userId: USER,
    purpose: "member_business",
    attested: true,
  });

  assert.equal(outcome.status, "failed", "the run failed on the upstream fault");

  assert.deepEqual(
    __creditFunctionsCalled(),
    [],
    `a failed free run reached a credit function: ${creditCallSummary()}`,
  );
  assert.equal(
    __creditCalls("refundSpend").length,
    0,
    "a free run has nothing to refund: it never spent anything",
  );
  assert.equal(
    __creditCalls("spendCredits").length,
    0,
    "and nothing was spent, which is exactly why a refund would be wrong",
  );

  // The failure is still recorded on the case. A guard that quietly skipped the
  // whole handler would pass the assertions above for the wrong reason.
  const updates = callsFor("verifications", "update");
  assert.ok(
    updates.some(
      (u) =>
        u.payload?.status === "failed" &&
        /registry upstream is down/.test(u.payload?.verdict_reason ?? ""),
    ),
    "the failure was written to the case",
  );
});

test("FALSIFIABILITY for the guard above: the same failure on the paid path still refunds", async () => {
  stage();
  __registryThrows("registry upstream is down");

  await runLevel2({ ...SUBJECT, userId: USER, purpose: "counterparty_check" });

  assert.equal(__creditCalls("spendCredits").length, 1, "the paid run paid");
  assert.equal(
    __creditCalls("refundSpend").length,
    1,
    "and got its money back, which is the behaviour the refund exists for",
  );
});

// ---------------------------------------------------------------------------
// 2. Falsifiability: the same harness must SEE a real credit call.
// ---------------------------------------------------------------------------

test("FALSIFIABILITY: a counterparty_check run does reach the credit path", async () => {
  stage();

  const outcome = await runLevel2({
    ...SUBJECT,
    userId: USER,
    purpose: "counterparty_check",
  });

  const spends = __creditCalls("spendCredits");
  assert.equal(
    spends.length,
    1,
    "the harness observed no spend on the PAID path, so it cannot observe one on the free " +
      "path either, and every zero-call assertion in this file would be vacuous",
  );
  assert.deepEqual(
    spends[0].args,
    [USER, COST_VERIFICATION_L2, "spend_verification", VERIFICATION_ID],
    "the spend carries the member, the L2 cost, the reason and the case it bought",
  );

  // And the paid case records what it paid with.
  const ledgerWrites = callsFor("verifications", "update").filter(
    (u) => u.payload && "credit_ledger_id" in u.payload,
  );
  assert.equal(ledgerWrites.length, 1, "the paid case records its ledger reference");
  assert.equal(outcome.status, "auto_verified", "the paid run still completes");
});

test("FALSIFIABILITY: a counterparty_check with no credits fails on insufficient credits", async () => {
  stage({ insufficient: true });

  const outcome = await runLevel2({
    ...SUBJECT,
    userId: USER,
    purpose: "counterparty_check",
  });

  assert.equal(__creditCalls("spendCredits").length, 1, "the spend was attempted");
  assert.equal(outcome.status, "failed");
  assert.match(outcome.reason, /insufficient credits/i);
  // The refusal happens before the work: no upstream was contacted.
  assert.equal(registryLookups.length, 0, "an unpaid counterparty check does no work");
});

// ---------------------------------------------------------------------------
// 3. The route: 402 is reachable for a counterparty check, never for the member.
// ---------------------------------------------------------------------------

const BODY = { name: "Harbor Trading Ltd", country: "GB", regNumber: "12345678" };

test("the route answers 402 for a counterparty check with an insufficient balance", async () => {
  stage({ balance: 0 });
  __setUser({ id: USER, email: "member@example.com" });

  const res = await POST(req({ ...BODY, purpose: "counterparty_check" }));

  assert.equal(res.status, 402, "the paid path still refuses an empty balance");
  const body = await res.json();
  assert.equal(body.cost, COST_VERIFICATION_L2);
  assert.equal(
    __creditCalls("getBalance").length,
    1,
    "the paid path read the balance, which is what makes the 402 reachable at all",
  );
  assert.equal(callsFor("verifications", "insert").length, 0, "no case is opened without funds");
});

test("the route never answers 402 for a member_business request, and reads no balance", async () => {
  // Same empty balance as the 402 case above. The only difference is the purpose.
  stage({ balance: 0 });
  __setUser({ id: USER, email: "member@example.com" });

  const res = await POST(
    req({ ...BODY, purpose: "member_business", attestation: true }),
  );

  assert.notEqual(res.status, 402, "a member-business request can never be refused for money");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "auto_verified", "the free request completed the check");

  assert.deepEqual(
    __creditFunctionsCalled(),
    [],
    `the route reached a credit function on the free path: ${creditCallSummary()}`,
  );
  assert.equal(
    callsFor("verifications", "insert").length,
    1,
    "the free request opened its case despite the zero balance",
  );
});

test("the route refuses a member_business request without an attestation, before any credit call", async () => {
  stage({ balance: 0 });
  __setUser({ id: USER, email: "member@example.com" });

  const res = await POST(req({ ...BODY, purpose: "member_business" }));

  assert.equal(res.status, 400);
  assert.deepEqual(__creditFunctionsCalled(), [], creditCallSummary());
});

// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  let passed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
    } catch (err) {
      console.error(`FAIL  ${t.name}`);
      console.error(`      ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }
  console.log(`ok   ${passed} member-business credit-free runtime tests passed`);
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
