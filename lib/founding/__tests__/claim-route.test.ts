// Behavioural tests for the founding attribution claim route (Block F
// attribution-integrity correction). Runs the real route end to end against the
// shared I/O mocks, so it proves the cookie- and database-facing behaviour the
// pure tests cannot.
//
// Run: npx tsx --tsconfig tsconfig.test.json lib/founding/__tests__/claim-route.test.ts
//
// tsconfig.test.json remaps @/lib/auth, @/lib/supabase/server, next/server and
// next/headers to the doubles in lib/__mocks__. This file imports those same
// doubles by relative path so the route and the test share one module instance,
// and therefore one cookie jar and one recorded-calls list. No top-level await:
// the repo is not type:module, so top-level await would compile to a cjs error.

import assert from "node:assert/strict";
import { POST } from "../../../app/api/founding/claim/route";
import { __setUser } from "../../__mocks__/auth";
import { __reset, callsFor } from "../../__mocks__/supabase-server";
import { __setCookie, __resetCookies, wasCleared } from "../../__mocks__/next-headers";
import { REFERRAL_COOKIE } from "../referral";

const ISSUED = 1_700_000_000_000;
const COOKIE = `founding.${ISSUED}`;
const AFTER = new Date(ISSUED + 5_000).toISOString(); // signed up after the invite
const LONG_BEFORE = new Date(ISSUED - 400 * 24 * 60 * 60 * 1000).toISOString();

let passed = 0;
const failures: string[] = [];
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (err) {
    failures.push(name);
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

async function run(): Promise<void> {
  await test("a newly created eligible profile is attributed exactly once", async () => {
    __setUser({ id: "u1" });
    __resetCookies();
    __setCookie(REFERRAL_COOKIE, COOKIE);
    __reset({
      responses: {
        "profiles:maybeSingle": { data: { referral_code: null, created_at: AFTER } },
        "profiles:update": { data: [{ id: "u1" }], error: null },
      },
    });

    const res = await POST();
    const body = await res.json();
    const writes = callsFor("profiles", "update");
    assert.equal(writes.length, 1, "expected exactly one profiles update");
    assert.deepEqual(writes[0].payload, { referral_code: "founding" });
    assert.equal(body.attributed, true);
  });

  await test("an established profile is not retroactively attributed", async () => {
    __setUser({ id: "u2" });
    __resetCookies();
    __setCookie(REFERRAL_COOKIE, COOKIE);
    __reset({
      responses: {
        "profiles:maybeSingle": { data: { referral_code: null, created_at: LONG_BEFORE } },
      },
    });

    const res = await POST();
    const body = await res.json();
    assert.equal(callsFor("profiles", "update").length, 0, "an established profile must not be written");
    assert.equal(body.eligible, false);
    assert.ok(!wasCleared(REFERRAL_COOKIE), "an ineligible cookie must be left for a possible new signup");
  });

  await test("an existing attribution cannot be overwritten", async () => {
    __setUser({ id: "u3" });
    __resetCookies();
    __setCookie(REFERRAL_COOKIE, COOKIE);
    __reset({
      responses: {
        "profiles:maybeSingle": { data: { referral_code: "founding", created_at: AFTER } },
      },
    });

    const res = await POST();
    const body = await res.json();
    assert.equal(callsFor("profiles", "update").length, 0, "must not overwrite an existing attribution");
    assert.equal(body.already, true);
  });

  await test("a successful persistence consumes the cookie", async () => {
    __setUser({ id: "u4" });
    __resetCookies();
    __setCookie(REFERRAL_COOKIE, COOKIE);
    __reset({
      responses: {
        "profiles:maybeSingle": { data: { referral_code: null, created_at: AFTER } },
        "profiles:update": { data: [{ id: "u4" }], error: null },
      },
    });

    await POST();
    assert.ok(wasCleared(REFERRAL_COOKIE), "the cookie must be consumed after a successful write");
  });

  await test("a failed persistence does not destroy the cookie needed for a safe retry", async () => {
    __setUser({ id: "u5" });
    __resetCookies();
    __setCookie(REFERRAL_COOKIE, COOKIE);
    __reset({
      responses: {
        "profiles:maybeSingle": { data: { referral_code: null, created_at: AFTER } },
        "profiles:update": { data: null, error: { message: "boom" } },
      },
    });

    const res = await POST();
    assert.equal(res.status, 500);
    assert.equal(callsFor("profiles", "update").length, 1, "the write should have been attempted");
    assert.ok(!wasCleared(REFERRAL_COOKIE), "the cookie must survive a failed write so a retry can succeed");
  });

  await test("no cookie means no work and nothing cleared", async () => {
    __setUser({ id: "u6" });
    __resetCookies();
    __reset({});

    const res = await POST();
    const body = await res.json();
    assert.equal(callsFor("profiles", "update").length, 0);
    assert.equal(body.attributed, false);
    assert.ok(!wasCleared(REFERRAL_COOKIE));
  });

  if (failures.length === 0) {
    console.log(`ok   ${passed} founding claim-route tests passed`);
  } else {
    console.error(`\n${failures.length} founding claim-route test(s) failed`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
