// Credits are withdrawn as a SEQUENCE, and the sequence has an order.
//
// Run: npx tsx lib/credits/__tests__/withdrawal.test.ts
//
// `DECISION-21` withdraws Ponte Credits. The instruction was explicit that this
// is not a delete, and the reason is that the two halves of "withdrawn" are not
// the same act:
//
//   the way IN     closed now
//   the RECORD     kept, permanently
//
// Somebody who bought credits owns them. A withdrawal that also erased the
// balance, the ledger or the ability to fulfil an in-flight payment would turn
// a completed purchase into a support case, and Stripe retries a webhook until
// it gets a 2xx.
//
// These assertions are on the SOURCE rather than on a running server, for the
// same reason the route-manifest and action-gate tests are: the property is
// structural, and a test that needs a deployment is a test that does not run.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const CHECKOUT = readFileSync("app/api/credits/checkout/route.ts", "utf8");
const BALANCE = readFileSync("app/api/credits/balance/route.ts", "utf8");
const WEBHOOK = readFileSync("app/api/webhooks/stripe/route.ts", "utf8");

// ---------------------------------------------------------------------------
// Step 1: no new purchase can be initiated
// ---------------------------------------------------------------------------

test("the checkout route cannot create a Stripe session", () => {
  assert.ok(!/checkout\.sessions\.create/.test(CHECKOUT), "the route can still open a Stripe checkout");
  assert.ok(!/getStripe/.test(CHECKOUT), "the route still reaches for the Stripe client");
  assert.ok(!/price_data|line_items/.test(CHECKOUT), "the route still describes a purchasable item");
});

test("it answers 410 Gone, not 404 and not 400", () => {
  // 404 is indistinguishable from a deployment fault and tells a caller
  // nothing. 410 says the resource existed and was withdrawn on purpose.
  assert.match(CHECKOUT, /status:\s*410/, "the withdrawn route does not answer 410");
  assert.ok(!/status:\s*404/.test(CHECKOUT), "the route answers 404, which reads as broken rather than withdrawn");
});

test("the answer names where pricing actually lives", () => {
  assert.match(CHECKOUT, /\/pricing/, "a caller is told nothing about where the product's price is now");
});

test("a person arriving in a browser is redirected rather than shown JSON", () => {
  assert.match(CHECKOUT, /export async function GET/, "there is no browser path");
  assert.match(CHECKOUT, /NextResponse\.redirect/, "a browser is shown raw JSON it cannot act on");
});

// ---------------------------------------------------------------------------
// Step 4: the record survives, and so does an in-flight payment
// ---------------------------------------------------------------------------

test("the webhook still fulfils a credit session", () => {
  /*
    This is the assertion that matters most in the whole file.

    A session created before the withdrawal can still be paid afterwards.
    Stripe retries until it gets a 2xx, so a webhook that stopped understanding
    credits would retry forever against money that has already left somebody's
    account.
  */
  assert.match(WEBHOOK, /fulfilCredits/, "the webhook no longer fulfils credit sessions");
  assert.match(WEBHOOK, /credit_purchases/, "the webhook no longer reads the purchase record");
});

test("a member can still see the balance and ledger they paid for", () => {
  assert.match(BALANCE, /getBalance/, "the balance is no longer readable");
  assert.match(BALANCE, /ledgerFor/, "the ledger is no longer readable");
});

test("but the balance response no longer offers anything to buy", () => {
  // A price list for a thing that answers 410.
  assert.ok(!/CREDIT_PACKS/.test(BALANCE), "the balance response still advertises purchasable packs");
  assert.match(BALANCE, /purchasable:\s*false/, "the response does not say that buying is closed");
});

// ---------------------------------------------------------------------------
// Step 6: removal comes last, and has not happened
// ---------------------------------------------------------------------------

test("the spend path is untouched, because verification still uses it", () => {
  /*
    `lib/verification/pipeline.ts` spends and refunds credits. That is a
    consumer of credit STATE, not of credit PURCHASE, and step 6 of the
    sequence forbids removing code before compatibility is proven.

    Pinned so a later tidy-up cannot delete the spend path while a member with
    a balance can still trigger it.
  */
  const pipeline = readFileSync("lib/verification/pipeline.ts", "utf8");
  assert.match(pipeline, /spendCredits/, "the verification spend path was removed before its consumers");
  assert.match(pipeline, /refundSpend/, "the refund path was removed, so a failed spend cannot be returned");
});

console.log(`ok   credits withdrawal: ${passed} assertions passed`);
