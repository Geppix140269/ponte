// Tests for Block D: structured expressions of interest, Market Signal
// investigation requests, the admin investigation queue, and the corrected
// NCNDA / deal-room copy.
//
// Run: npx tsx lib/signals/__tests__/block-d.test.ts
//
// The pure rules (what makes a request meaningful, the requester/role
// vocabularies, the admin status set, and the confirmation-links-a-listing
// rule) are unit-tested directly. Enforcement is then pinned by structural
// assertions: the interest route persists the structured fields and disclosure
// stays accept-only; the investigate route requires auth, validates, never
// reads a counterparty column, and counts the request; the admin action drives
// the full status set and links a real listing on confirmation; and no live
// message string claims an NCNDA was signed or that a deal room exists.
//
// Acceptance coverage: 6-10 (signal investigation -> admin states -> confirmed
// links an opportunity, no third-party contact), 20-22 (structured expression
// of interest -> owner accept/decline -> disclosure only at accept), and the
// NCNDA/deal-room copy truth.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cleanInterest,
  interestIsComplete,
  missingInterestFields,
  isInterestRole,
  stripContact,
  INTEREST_ROLES,
  INTEREST_ROLE_LABELS,
} from "../../interest/expression";
import {
  cleanInvestigation,
  investigationIsComplete,
  missingInvestigationFields,
  isRequesterType,
  REQUESTER_TYPES,
  REQUESTER_TYPE_LABELS,
} from "../investigation";
import {
  ADMIN_SETTABLE_STATUSES,
  isAdminSettableStatus,
  confirmationLinksListing,
  confirmationLinkVerdict,
  PUBLIC_SIGNAL_STATUS,
} from "../admin-status";

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

// --- Expression of interest (brief Block D, tests 20-22) --------------------

const FULL_INTEREST = {
  interested_business: "Delta Foods Ltd",
  interest_role: "buyer",
  interest_target: "2 x 20ft per month from Q1",
  interest_geography: "Rotterdam, EU distribution",
  interest_reason: "We buy this grade for our EU retail lines.",
};

test("interest: a complete request passes and round-trips its fields", () => {
  const e = cleanInterest(FULL_INTEREST);
  assert.equal(interestIsComplete(e), true);
  assert.deepEqual(missingInterestFields(e), []);
  assert.equal(e.interest_role, "buyer");
  assert.equal(e.interested_business, "Delta Foods Ltd");
});

test("interest: every one of the five fields is mandatory", () => {
  for (const drop of [
    "interested_business",
    "interest_role",
    "interest_target",
    "interest_geography",
    "interest_reason",
  ]) {
    const raw = { ...FULL_INTEREST } as Record<string, unknown>;
    delete raw[drop];
    const e = cleanInterest(raw);
    assert.equal(interestIsComplete(e), false, `${drop} should be required`);
    assert.ok(missingInterestFields(e).includes(drop));
  }
});

test("interest: an unknown role is rejected, never silently defaulted", () => {
  const e = cleanInterest({ ...FULL_INTEREST, interest_role: "financier" });
  assert.equal(e.interest_role, null);
  assert.equal(interestIsComplete(e), false);
  assert.equal(isInterestRole("financier"), false);
  assert.equal(isInterestRole("distributor"), true);
});

test("interest: text is trimmed, collapsed and capped", () => {
  const e = cleanInterest({
    ...FULL_INTEREST,
    interested_business: "  Delta   Foods   Ltd  ",
    interest_reason: "x".repeat(5000),
  });
  assert.equal(e.interested_business, "Delta Foods Ltd");
  assert.ok(e.interest_reason.length <= 600);
});

test("interest: accepts both the API and the short field aliases", () => {
  const e = cleanInterest({
    business: "Acme",
    role: "seller",
    target: "500 MT ready",
    geography: "Brazil",
    reason: "We produce it.",
  });
  assert.equal(interestIsComplete(e), true);
  assert.equal(e.interest_role, "seller");
});

test("interest: the role vocabulary and labels line up", () => {
  assert.deepEqual([...INTEREST_ROLES], ["buyer", "seller", "distributor", "intermediary"]);
  for (const r of INTEREST_ROLES) assert.ok(INTEREST_ROLE_LABELS[r]);
});

// --- Investigation request (brief Block D, tests 6-10) ---------------------

const FULL_INVESTIGATION = {
  requesting_business: "Harbor Trading SpA",
  requester_type: "supplier",
  establish_goal: "Who is behind this and whether it is still current.",
  indicative: "3 x 40ft per month from March",
  geography: "Genoa",
  evidence: "ISO 22000, phytosanitary certificates",
  wants_intro: true,
};

test("investigation: a complete request passes and round-trips its fields", () => {
  const r = cleanInvestigation(FULL_INVESTIGATION);
  assert.equal(investigationIsComplete(r), true);
  assert.deepEqual(missingInvestigationFields(r), []);
  assert.equal(r.requester_type, "supplier");
  assert.equal(r.wants_intro, true);
});

test("investigation: business, requester type and the ask are mandatory", () => {
  for (const drop of ["requesting_business", "requester_type", "establish_goal"]) {
    const raw = { ...FULL_INVESTIGATION } as Record<string, unknown>;
    delete raw[drop];
    const r = cleanInvestigation(raw);
    assert.equal(investigationIsComplete(r), false, `${drop} should be required`);
    assert.ok(missingInvestigationFields(r).includes(drop));
  }
});

test("investigation: geography, indicative and evidence are optional", () => {
  const r = cleanInvestigation({
    requesting_business: "Harbor Trading SpA",
    requester_type: "buyer",
    establish_goal: "Whether a qualified introduction can be arranged.",
  });
  assert.equal(investigationIsComplete(r), true);
  assert.equal(r.indicative, "");
  assert.equal(r.geography, "");
});

test("investigation: an unknown requester type is rejected", () => {
  const r = cleanInvestigation({ ...FULL_INVESTIGATION, requester_type: "banker" });
  assert.equal(r.requester_type, null);
  assert.equal(investigationIsComplete(r), false);
  assert.equal(isRequesterType("banker"), false);
  assert.equal(isRequesterType("adviser"), true);
});

test("investigation: wants_intro coerces truthy forms and defaults false", () => {
  for (const truthy of [true, "true", "on", "1"]) {
    assert.equal(cleanInvestigation({ ...FULL_INVESTIGATION, wants_intro: truthy }).wants_intro, true);
  }
  for (const falsy of [false, "false", "", undefined, 0, "no"]) {
    assert.equal(cleanInvestigation({ ...FULL_INVESTIGATION, wants_intro: falsy }).wants_intro, false);
  }
});

test("investigation: the requester-type vocabulary and labels line up", () => {
  assert.deepEqual([...REQUESTER_TYPES], ["supplier", "buyer", "intermediary", "adviser"]);
  for (const rt of REQUESTER_TYPES) assert.ok(REQUESTER_TYPE_LABELS[rt]);
});

// --- Admin status transitions (brief Block D, tests 9-10) ------------------

test("admin: the settable set is the investigation lifecycle, never the public status", () => {
  for (const s of ["private", "under_investigation", "confirmed", "unavailable", "expired", "withdrawn"]) {
    assert.equal(isAdminSettableStatus(s), true, `${s} must be settable`);
  }
  // Approval to the board is a separate, dedicated action.
  assert.equal(isAdminSettableStatus("approved_signal"), false);
  assert.equal(ADMIN_SETTABLE_STATUSES.includes(PUBLIC_SIGNAL_STATUS), false);
  assert.equal(isAdminSettableStatus("nonsense"), false);
});

test("admin: confirmation links a listing only when a listing id is supplied", () => {
  assert.equal(confirmationLinksListing("confirmed", "abc-123"), true);
  assert.equal(confirmationLinksListing("confirmed", null), false);
  assert.equal(confirmationLinksListing("confirmed", undefined), false);
  // A non-confirmation never links, even with an id.
  assert.equal(confirmationLinksListing("unavailable", "abc-123"), false);
});

// --- Structural: the enforcement is actually wired -------------------------

function src(path: string): string {
  return readFileSync(path, "utf8");
}

test("20: the interest route persists the structured expression of interest", () => {
  const s = src("app/api/marketplace/interest/route.ts");
  assert.ok(s.includes("cleanInterest("), "must normalise via the shared rule");
  assert.ok(s.includes("interestIsComplete("), "must reject an incomplete request");
  for (const col of [
    "interested_business",
    "interest_role",
    "interest_target",
    "interest_geography",
    "interest_reason",
  ]) {
    assert.ok(s.includes(col), `interest route must persist ${col}`);
  }
});

test("20: the interest button keeps the request across the account gate", () => {
  const s = src("components/InterestButton.tsx");
  assert.ok(s.includes("AccountGate"), "must attach the account gate");
  assert.ok(s.includes("pending"), "must capture the request so the gate can resume it");
  assert.ok(s.includes("/api/marketplace/interest"), "must post to the interest route");
  assert.ok(s.includes("interestIsComplete"), "must not send an incomplete request");
});

test("22: connection request reveals no contact; disclosure waits for accept", () => {
  const s = src("app/api/marketplace/interest/route.ts");
  // The owner is notified with the ref and product only, never the requester.
  assert.ok(
    s.includes("sendConnectRequest(ownerEmail, { ref: listing.ref, product: listing.product })"),
    "request-time email must not carry the requester's identity",
  );

  const a = src("app/[locale]/marketplace/actions.ts");
  const acceptGate = a.indexOf('decision === "accepted"');
  const firstDisclosure = a.indexOf("sendConnectAccepted(");
  assert.ok(acceptGate !== -1, "the decision action must branch on accepted");
  assert.ok(
    firstDisclosure > acceptGate,
    "both-sides contact disclosure must sit inside the accepted branch",
  );
});

test("7-8: the investigate route requires auth, validates, and reveals no third party", () => {
  const s = src("app/api/market-signals/investigate/route.ts");
  assert.ok(s.includes("status: 401"), "must gate on sign-in (opens the account gate)");
  assert.ok(s.includes("cleanInvestigation("), "must normalise via the shared rule");
  assert.ok(s.includes("investigationIsComplete("), "must reject an incomplete request");
  assert.ok(s.includes("signal_investigations"), "must record the request");
  // A Market Signal has no stored third party; the route must never read one.
  for (const leak of [
    "counterparty_name",
    "counterparty_company",
    "counterparty_contact",
    "source_url",
    "raw_description",
  ]) {
    assert.ok(!s.includes(leak), `investigate route must never read ${leak}`);
  }
});

test("6: the investigation request is counted privately", () => {
  const s = src("app/api/market-signals/investigate/route.ts");
  assert.ok(s.includes("investigation_count"), "must maintain the private per-signal counter");
});

test("9: the admin action drives the full investigation status set", () => {
  const s = src("app/[locale]/admin/signals/actions.ts");
  assert.ok(s.includes("isAdminSettableStatus("), "must validate against the shared status set");
});

test("10: confirmation links a normal listing and never writes a badge", () => {
  const s = src("app/[locale]/admin/signals/actions.ts");
  assert.ok(s.includes("promoted_listing_id"), "confirmation must link a real listing");
  assert.ok(
    s.includes('.from("listings")') && s.includes('.eq("ref", listingRef)'),
    "the linked listing is resolved from a real listing reference",
  );
  // Promotion must not grant a badge or a verification level to the signal.
  for (const badge of ["verification_level", "business_verification_id", "verified_trader"]) {
    assert.ok(!s.includes(badge), `signal confirmation must not write ${badge}`);
  }
});

test("the Block D migration is additive, idempotent and RLS-guarded", () => {
  const m = src("supabase/migrations/20260723d_investigation_and_interest.sql");
  assert.ok(m.includes("add column if not exists interested_business"));
  assert.ok(m.includes("create table if not exists signal_investigations"));
  assert.ok(m.includes("enable row level security"));
  assert.ok(m.includes("auth.uid() = requester_id"), "requester-scoped insert policy");
  assert.ok(!/\b(drop table|delete from|truncate)\b/i.test(m), "must not be destructive");
});

// --- Copy truth: no interface claims an NCNDA was signed or a deal room ------

const LOCALES = ["en", "zh", "es", "ar", "fr", "pt", "ru", "de", "hi", "it"];
// The former home.flow.* and landing.* keys were removed when the homepage was
// rebuilt as the "What's your deal?" gateway (the `landing` namespace is gone
// and `home` was replaced). The marketplace, process and home.metaDescription
// copy that this guard exists for is unchanged and still checked here.
const CORRECTED_KEYS = [
  "process.steps.connect.micro",
  "marketplace.hero.heading",
  "marketplace.rules.anonymous.body",
  "marketplace.how.heading",
  "home.metaDescription",
];

function pick(obj: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
}

test("copy: the corrected keys claim no NCNDA and no deal room, in every locale", () => {
  for (const loc of LOCALES) {
    const json = JSON.parse(readFileSync(`messages/${loc}.json`, "utf8"));
    for (const key of CORRECTED_KEYS) {
      const value = String(pick(json, key) ?? "");
      assert.ok(value.length > 0, `${loc}:${key} must exist`);
      assert.ok(
        !/NCNDA|deal room|papered/i.test(value),
        `${loc}:${key} still claims NCNDA/deal room/papered: ${value}`,
      );
    }
  }
});

// --- Follow-up 1: pre-accept identity and contact scrubbing ----------------

test("stripContact redacts emails, phones, URLs and bare domains", () => {
  assert.ok(!/@/.test(stripContact("reach me at bob@acme.com")));
  assert.ok(!/acme\.com/i.test(stripContact("see acme.com for details")));
  assert.ok(!/https?:|www\./i.test(stripContact("https://acme.com and www.x.io")));
  assert.ok(stripContact("call +39 351 123 4567 now").includes("[removed]"));
  assert.ok(stripContact("whatsapp 07700 900123").includes("[removed]"));
});

test("stripContact leaves genuine trade text (quantities, corridors) intact", () => {
  assert.equal(stripContact("2 x 20ft per month from Q1"), "2 x 20ft per month from Q1");
  assert.equal(stripContact("12000 MT, CIF Rotterdam"), "12000 MT, CIF Rotterdam");
  assert.equal(stripContact("Genoa to Shanghai corridor"), "Genoa to Shanghai corridor");
});

test("cleanInterest scrubs the pre-accept fields but keeps the business name", () => {
  const e = cleanInterest({
    interested_business: "Acme Trading Ltd", // revealed only post-accept, not scrubbed
    interest_role: "buyer",
    interest_target: "email me bob@acme.com",
    interest_geography: "reach www.acme.com",
    interest_reason: "call +1 202 555 0143 to discuss",
  });
  assert.equal(e.interested_business, "Acme Trading Ltd");
  assert.ok(!/@|acme\.com/i.test(e.interest_target), "target must be scrubbed");
  assert.ok(!/acme\.com|www\./i.test(e.interest_geography), "geography must be scrubbed");
  assert.ok(e.interest_reason.includes("[removed]"), "reason phone must be scrubbed");
});

test("22: the owner never receives the business name before acceptance", () => {
  const p = src("app/[locale]/marketplace/page.tsx");
  // The pending-request query must not select the business identity at all.
  const pendingSelect = p.slice(p.indexOf("listing_connections"), p.indexOf("listing_connections") + 300);
  assert.ok(
    !pendingSelect.includes("interested_business"),
    "the pending-connections read must not select interested_business",
  );
  assert.ok(p.includes("Confirmed member"), "pre-accept label must be the neutral 'Confirmed member'");
});

test("22: identity is disclosed to the owner only on acceptance", () => {
  const a = src("app/[locale]/marketplace/actions.ts");
  const acceptGate = a.indexOf('decision === "accepted"');
  const nameDisclosure = a.indexOf("otherName:");
  assert.ok(acceptGate !== -1 && nameDisclosure > acceptGate, "otherName must be sent inside the accepted branch");
  assert.ok(a.includes("interested_business"), "the decision action must read the business to disclose it");
  const email = src("lib/email.ts");
  assert.ok(email.includes("otherName"), "the accepted email must be able to render the business name");
});

// --- Follow-up 2: investigation idempotency and count accuracy --------------

test("investigation dedupe: a unique constraint and an atomic count trigger exist", () => {
  const m = src("supabase/migrations/20260723e_investigation_dedupe_and_count.sql");
  assert.ok(
    m.includes("unique (signal_id, requester_id)"),
    "one investigation request per member per signal",
  );
  assert.ok(m.includes("create trigger") && m.includes("investigation_count"), "count kept by a trigger");
  assert.ok(m.includes("after insert or delete"), "count recomputed on insert and delete");
  assert.ok(m.includes("security definer"), "the trigger must cross the RLS boundary safely");
});

test("investigation dedupe: a duplicate request is a no-op, not a double count", () => {
  const s = src("app/api/market-signals/investigate/route.ts");
  assert.ok(s.includes('.includes("duplicate")'), "a duplicate insert must be tolerated");
  assert.ok(s.includes("duplicate: true"), "a duplicate returns success without re-notifying");
  // The manual recompute is gone: the count is maintained by the DB trigger, so
  // there is no partial-failure window in application code.
  assert.ok(
    !s.includes('.update({ investigation_count'),
    "the route must not hand-maintain investigation_count any more",
  );
});

// --- Follow-up 3: confirmation genuinely links a live Qualified Opportunity --

const CURRENT_APPROVED = { status: "approved", valid_until: null, reconfirmed_at: "2999-01-01T00:00:00Z" };

test("confirmation verdict: only an approved, current, eligible-owner listing links", () => {
  assert.equal(confirmationLinkVerdict(CURRENT_APPROVED, true).ok, true);
  assert.equal(confirmationLinkVerdict(null, true).reason, "listing_missing");
  assert.equal(
    confirmationLinkVerdict({ ...CURRENT_APPROVED, status: "submitted" }, true).reason,
    "listing_not_approved",
  );
  // Expired finite validity is not current.
  assert.equal(
    confirmationLinkVerdict({ status: "approved", valid_until: "2000-01-01T00:00:00Z", reconfirmed_at: "2999-01-01T00:00:00Z" }, true).reason,
    "listing_not_current",
  );
  // Never reconfirmed => reconfirmation lapsed => not current.
  assert.equal(
    confirmationLinkVerdict({ status: "approved", valid_until: null, reconfirmed_at: null }, true).reason,
    "listing_not_current",
  );
  // Approved and current but the owner's verification no longer passes.
  assert.equal(confirmationLinkVerdict(CURRENT_APPROVED, false).reason, "listing_owner_ineligible");
});

test("10: the admin confirm action requires a listing and gates it fully", () => {
  const s = src("app/[locale]/admin/signals/actions.ts");
  assert.ok(s.includes('finish("confirm_needs_listing")'), "confirm without a listing ref is refused");
  assert.ok(s.includes("confirmationLinkVerdict("), "the linked listing is gated, not merely resolved");
  assert.ok(s.includes("eligibleOwnerIds("), "owner verification currency is checked");
  assert.ok(
    s.includes("valid_until") && s.includes("reconfirmed_at") && s.includes('.select("id, user_id, status'),
    "the listing is loaded with the fields the gate needs",
  );
  assert.ok(s.includes("promoted_listing_id"), "status and the link are written together");
});

console.log(`\n${passed} passed`);
