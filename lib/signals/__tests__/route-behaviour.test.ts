// Block D behavioural acceptance: the routes and server actions are invoked for
// real, with @/lib/supabase/server, @/lib/auth, @/lib/email, @/lib/rate-limit,
// @/lib/board/market-signals, @/lib/listings/public-filter and the next/*
// modules remapped to test doubles (see tsconfig.test.json). Nothing is stubbed
// inside the route: the real orchestration runs against a fake database and
// fake mailer, so these tests prove behaviour, not wiring.
//
// Run: npx tsx --tsconfig tsconfig.test.json lib/signals/__tests__/route-behaviour.test.ts
//
// Proves the seven acceptance points of the Block D follow-up:
//   1. a successful investigation creates one request and one desk notification;
//   2. a duplicate investigation succeeds with no notification and no count write;
//   3. the request-time interest email never exposes interested_business;
//   4. contact is stripped server-side before the pre-accept fields are stored;
//   5. confirmation with no/invalid listing performs no update;
//   6. successful confirmation performs one update with status + promoted_listing_id;
//   7. the accepted branch sends each party the right identity/contact.

/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { __reset, callsFor } from "../../__mocks__/supabase-server";
import { __resetEmail, sentOf } from "../../__mocks__/email";
import { __setUser } from "../../__mocks__/auth";
import { __setSignal } from "../../__mocks__/board-market-signals";
import { __setEligible } from "../../__mocks__/public-filter";
import { RedirectError } from "../../__mocks__/next-navigation";

import { POST as interestPOST } from "../../../app/api/marketplace/interest/route";
import { POST as investigatePOST } from "../../../app/api/market-signals/investigate/route";
import { connectDecisionAction } from "../../../app/[locale]/marketplace/actions";
import { setSignalStatusAction } from "../../../app/[locale]/admin/signals/actions";

const tests: { name: string; fn: () => Promise<void> }[] = [];
function test(name: string, fn: () => Promise<void>): void {
  tests.push({ name, fn });
}

function req(body: any) {
  return { json: async () => body } as any;
}
function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}
/** Run an action that ends by redirect(); return the `r` outcome code. */
async function redirectCode(run: () => Promise<void>): Promise<string> {
  try {
    await run();
  } catch (e) {
    if (e instanceof RedirectError) {
      return new URL(e.url, "http://t").searchParams.get("r") ?? "";
    }
    throw e;
  }
  throw new Error("expected a redirect, but the action returned normally");
}

const SIGNAL_ID = "11111111-1111-1111-1111-111111111111";

// 1. Successful investigation: one request, one desk notification.
test("investigation success creates one request and one desk notification", async () => {
  __setUser({ id: "u1", email: "u1@x.com" });
  __setSignal({ state: "visible", signal: { side: "requirement", product: "Sugar ICUMSA 45" } });
  __reset({ responses: { "signal_investigations:insert": { error: null } } });
  __resetEmail();

  const res = await investigatePOST(
    req({ signal_id: SIGNAL_ID, business: "Harbor Trading", type: "supplier", goal: "who is behind it" }),
  );

  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
  assert.equal(callsFor("signal_investigations", "insert").length, 1, "exactly one request row");
  assert.equal(sentOf("sendBrokerageSubmission").length, 1, "exactly one desk notification");
  assert.equal(callsFor("desk_radar", "update").length, 0, "count is trigger-maintained, not written here");
});

// 2. Duplicate investigation: success, no notification, no count write.
test("duplicate investigation is a no-op: no second notification, no count write", async () => {
  __setUser({ id: "u1", email: "u1@x.com" });
  __setSignal({ state: "visible", signal: { side: "requirement", product: "Sugar ICUMSA 45" } });
  __reset({
    responses: {
      "signal_investigations:insert": {
        error: { message: 'duplicate key value violates unique constraint "signal_investigations_unique_requester"' },
      },
    },
  });
  __resetEmail();

  const res = await investigatePOST(
    req({ signal_id: SIGNAL_ID, business: "Harbor Trading", type: "supplier", goal: "who is behind it" }),
  );

  assert.equal(res.status, 200);
  assert.equal((await res.json()).duplicate, true, "the duplicate is reported, not failed");
  assert.equal(sentOf("sendBrokerageSubmission").length, 0, "no second desk notification");
  assert.equal(callsFor("desk_radar", "update").length, 0, "no manual count update");
});

// 3. The request-time interest email never exposes interested_business.
test("interest request-time email carries the ref and product only, never the business", async () => {
  __setUser({ id: "req1", email: "req1@x.com" });
  __reset({
    responses: {
      "listings:maybeSingle": { data: { id: "L1", ref: "PT-0100", type: "offer", product: "Sugar", user_id: "owner1" } },
      "listing_connections:insert": { error: null },
    },
    getUserById: () => ({ data: { user: { email: "owner1@x.com" } } }),
  });
  __resetEmail();

  await interestPOST(
    req({ ref: "PT-0100", business: "Delta Foods Ltd", role: "buyer", target: "2 x 20ft", geography: "Rotterdam", reason: "fit" }),
  );

  const owner = sentOf("sendConnectRequest");
  assert.equal(owner.length, 1);
  assert.deepEqual(owner[0].data, { ref: "PT-0100", product: "Sugar" }, "only ref + product");
  assert.ok(
    !JSON.stringify(owner[0]).includes("Delta Foods"),
    "the business name must not appear anywhere in the owner notification",
  );
});

// 4. Contact stripping is applied server-side before the pre-accept fields are stored.
test("contact is stripped from pre-accept fields before persistence, business kept", async () => {
  __setUser({ id: "req2", email: "req2@x.com" });
  __reset({
    responses: {
      "listings:maybeSingle": { data: { id: "L1", ref: "PT-0100", type: "offer", product: "Sugar", user_id: "owner1" } },
      "listing_connections:insert": { error: null },
    },
    getUserById: () => ({ data: { user: { email: "owner1@x.com" } } }),
  });
  __resetEmail();

  await interestPOST(
    req({
      ref: "PT-0100",
      business: "Acme Ltd",
      role: "seller",
      target: "email me bob@acme.com",
      geography: "ring +1 202 555 0143",
      reason: "see www.acme.com",
    }),
  );

  const insert = callsFor("listing_connections", "insert");
  assert.equal(insert.length, 1);
  const p = insert[0].payload;
  assert.equal(p.interested_business, "Acme Ltd", "business is preserved for post-accept disclosure");
  assert.ok(!/@|acme\.com/i.test(p.interest_target), "email stripped from target");
  assert.ok(p.interest_geography.includes("[removed]"), "phone stripped from geography");
  assert.ok(!/acme\.com|www\./i.test(p.interest_reason), "URL stripped from reason");
});

// 5. Confirmation with no/invalid listing performs no update.
const ADMIN_OK = { "profiles:maybeSingle": { data: { role: "admin" } }, "desk_radar:maybeSingle": { data: { id: "S1" } } };

async function confirmCase(listing: any, eligible: string[], listingRef = "PT-9"): Promise<string> {
  __setUser({ id: "admin1", email: "admin@x.com" });
  __setEligible(eligible);
  __reset({
    responses: {
      ...ADMIN_OK,
      "listings:maybeSingle": { data: listing },
      "desk_radar:update": { error: null },
    },
  });
  const entries: Record<string, string> = { id: "S1", status: "confirmed" };
  if (listingRef) entries.listing_ref = listingRef;
  return redirectCode(() => setSignalStatusAction(form(entries)));
}

test("confirmation without a listing reference performs no update", async () => {
  __setUser({ id: "admin1", email: "admin@x.com" });
  __reset({ responses: { ...ADMIN_OK } });
  const code = await redirectCode(() => setSignalStatusAction(form({ id: "S1", status: "confirmed" })));
  assert.equal(code, "confirm_needs_listing");
  assert.equal(callsFor("desk_radar", "update").length, 0);
});

test("confirmation of a submitted listing performs no update", async () => {
  const code = await confirmCase({ id: "L9", user_id: "o9", status: "submitted", valid_until: null, reconfirmed_at: "2999-01-01T00:00:00Z" }, ["o9"]);
  assert.equal(code, "listing_not_approved");
  assert.equal(callsFor("desk_radar", "update").length, 0);
});

test("confirmation of an expired listing performs no update", async () => {
  const code = await confirmCase({ id: "L9", user_id: "o9", status: "approved", valid_until: "2000-01-01T00:00:00Z", reconfirmed_at: "2999-01-01T00:00:00Z" }, ["o9"]);
  assert.equal(code, "listing_not_current");
  assert.equal(callsFor("desk_radar", "update").length, 0);
});

test("confirmation of a reconfirmation-lapsed listing performs no update", async () => {
  const code = await confirmCase({ id: "L9", user_id: "o9", status: "approved", valid_until: null, reconfirmed_at: null }, ["o9"]);
  assert.equal(code, "listing_not_current");
  assert.equal(callsFor("desk_radar", "update").length, 0);
});

test("confirmation with a verification-ineligible owner performs no update", async () => {
  const code = await confirmCase({ id: "L9", user_id: "o9", status: "approved", valid_until: null, reconfirmed_at: "2999-01-01T00:00:00Z" }, []);
  assert.equal(code, "listing_owner_ineligible");
  assert.equal(callsFor("desk_radar", "update").length, 0);
});

// 6. Successful confirmation performs one update with status + promoted_listing_id.
test("successful confirmation performs one update carrying status and the link", async () => {
  const code = await confirmCase({ id: "L9", user_id: "o9", status: "approved", valid_until: null, reconfirmed_at: "2999-01-01T00:00:00Z" }, ["o9"]);
  assert.equal(code, "confirmed");
  const updates = callsFor("desk_radar", "update");
  assert.equal(updates.length, 1, "exactly one write");
  assert.deepEqual(updates[0].payload, { status: "confirmed", promoted_listing_id: "L9" });
});

// 7. The accepted branch discloses identity/contact to each party correctly.
test("accepting a connection discloses the business to the owner and contact both ways", async () => {
  __setUser({ id: "ownerX", email: "owner@x.com" });
  __reset({
    responses: {
      "listing_connections:maybeSingle": { data: { listing_id: "L1", requester_id: "reqX", interested_business: "Acme Ltd" } },
      "listings:maybeSingle": { data: { ref: "PT-5", product: "Sugar", user_id: "ownerX" } },
    },
    getUserById: () => ({ data: { user: { email: "req@y.com" } } }),
  });
  __resetEmail();

  await connectDecisionAction(form({ id: "C1", decision: "accepted" }));

  const accepted = sentOf("sendConnectAccepted");
  assert.equal(accepted.length, 2, "both parties are emailed");

  const toOwner = accepted.find((e) => e.to === "owner@x.com");
  const toReq = accepted.find((e) => e.to === "req@y.com");
  assert.ok(toOwner && toReq, "one email to each side");
  // Owner learns who the requester is (business name) and their contact.
  assert.equal(toOwner!.data.otherName, "Acme Ltd");
  assert.equal(toOwner!.data.otherEmail, "req@y.com");
  // Requester gets the owner's contact; no spurious business name is invented.
  assert.equal(toReq!.data.otherEmail, "owner@x.com");
  assert.equal(toReq!.data.otherName, undefined);
});

// A declined decision discloses nothing.
test("declining a connection discloses nothing to either party", async () => {
  __setUser({ id: "ownerX", email: "owner@x.com" });
  __reset({
    responses: {
      "listing_connections:maybeSingle": { data: { listing_id: "L1", requester_id: "reqX", interested_business: "Acme Ltd" } },
    },
  });
  __resetEmail();

  await connectDecisionAction(form({ id: "C1", decision: "declined" }));
  assert.equal(sentOf("sendConnectAccepted").length, 0, "no contact disclosure on decline");
});

async function run() {
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
  console.log(`\n${passed} passed`);
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
