// The protected invitation: acceptance criterion 3.
//
// Run: npx tsx lib/deal-room/__tests__/invitation.test.ts

import assert from "node:assert/strict";
import {
  INVITATION_FAILURE_MESSAGE,
  INVITATION_TTL_DAYS,
  PREVIEW_KEYS,
  buildPreview,
  hashInvitationToken,
  invitationTokenMatches,
  mintInvitationToken,
  resolveInvitationState,
} from "../invitation";

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

// ---------------------------------------------------------------------------
// The token
// ---------------------------------------------------------------------------

test("a minted token is 256 bits, URL-safe, and never equal to its own hash", () => {
  const minted = mintInvitationToken();
  assert.equal(Buffer.from(minted.token, "base64url").length, 32);
  assert.match(minted.token, /^[A-Za-z0-9_-]+$/, "the token must survive a URL path without escaping");
  assert.notEqual(minted.token, minted.tokenSha256);
});

test("the stored value is a sha256 digest, matching the column constraint", () => {
  const minted = mintInvitationToken();
  assert.match(minted.tokenSha256, /^[0-9a-f]{64}$/);
  assert.equal(minted.tokenSha256, hashInvitationToken(minted.token));
});

test("two mints never collide", () => {
  const tokens = new Set(Array.from({ length: 200 }, () => mintInvitationToken().token));
  assert.equal(tokens.size, 200);
});

test("expiry is the declared TTL from now", () => {
  const now = new Date("2026-07-29T10:00:00Z");
  const minted = mintInvitationToken(now);
  const days = (minted.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  assert.equal(days, INVITATION_TTL_DAYS);
});

test("a matching token verifies and a near-miss does not", () => {
  const minted = mintInvitationToken();
  assert.equal(invitationTokenMatches(minted.token, minted.tokenSha256), true);
  assert.equal(invitationTokenMatches(minted.token + "x", minted.tokenSha256), false);
  assert.equal(invitationTokenMatches("", minted.tokenSha256), false);
});

test("a malformed stored digest is refused rather than throwing", () => {
  const minted = mintInvitationToken();
  assert.equal(invitationTokenMatches(minted.token, "short"), false);
});

// ---------------------------------------------------------------------------
// The preview: an allowlist, not a redaction
// ---------------------------------------------------------------------------

const PREVIEW = buildPreview({
  invitingOrganisation: "Atlantico Comercio Ltda",
  dealSubject: "Refined cane sugar, 500 MT",
  marketFamily: "products",
  proposedRole: "Buyer",
  proposedParticipantClass: "principal",
  roomSponsor: "Atlantico Comercio Ltda",
  expiresAt: new Date("2026-08-12T10:00:00Z"),
});

test("the preview contains exactly the allowlisted keys and nothing else", () => {
  assert.deepEqual(Object.keys(PREVIEW).sort(), [...PREVIEW_KEYS].sort());
});

test("the preview carries no protected room content", () => {
  // Scanned over the DISCLOSED fields only. `notYetDisclosed` names the
  // withheld categories on purpose - saying "no evidence is disclosed" is the
  // opposite of disclosing evidence - and `admissionRequirements` names the
  // gates, so including either here would fail the test for doing its job.
  const { notYetDisclosed: _withheld, admissionRequirements: _gates, ...disclosed } = PREVIEW;
  const text = JSON.stringify(disclosed).toLowerCase();
  for (const leak of [
    "evidence",
    "procedure",
    "blocker",
    "clarification",
    "sub_room",
    "sub-room",
    "workspace id",
    "participant list",
    "price",
    "terms of payment",
  ]) {
    assert.ok(!text.includes(leak), `the invitation preview mentions '${leak}'`);
  }
});

test("the preview carries no identifier that could be enumerated", () => {
  const text = JSON.stringify(PREVIEW);
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(text), "a uuid in the preview is an enumeration surface");
});

test("the preview states what is deliberately not disclosed", () => {
  assert.ok(PREVIEW.notYetDisclosed.length >= 4);
  const text = PREVIEW.notYetDisclosed.join(" ").toLowerCase();
  assert.ok(text.includes("document") || text.includes("evidence"));
  assert.ok(text.includes("procedure"));
  assert.ok(text.includes("commercial terms"));
  assert.ok(text.includes("who else is participating"));
  assert.ok(text.includes("any other workspace"), "the existence of other workspaces must be explicitly withheld");
});

test("the admission requirements list every gate", () => {
  const text = PREVIEW.admissionRequirements.join(" ").toLowerCase();
  for (const gate of ["sign in", "organisation", "role", "authorised", "participation agreement", "confidentiality", "room rules"]) {
    assert.ok(text.includes(gate), `the admission list omits '${gate}'`);
  }
});

// ---------------------------------------------------------------------------
// Resolution: every failure looks the same
// ---------------------------------------------------------------------------

const FUTURE = "2026-12-31T00:00:00Z";
const PAST = "2026-01-01T00:00:00Z";
const NOW = new Date("2026-07-29T10:00:00Z");

test("a valid sent invitation resolves", () => {
  const result = resolveInvitationState({ id: "inv1", state: "sent", expiresAt: FUTURE }, NOW);
  assert.deepEqual(result, { ok: true, invitationId: "inv1" });
});

test("an unknown token is not_found, and says nothing more", () => {
  const result = resolveInvitationState(null, NOW);
  assert.deepEqual(result, { ok: false, reason: "not_found" });
  assert.match(INVITATION_FAILURE_MESSAGE.not_found, /not valid/);
  assert.ok(
    !INVITATION_FAILURE_MESSAGE.not_found.toLowerCase().includes("room"),
    "the not-found message must not confirm a room exists",
  );
});

test("a past expiry resolves as expired even when the row still says sent", () => {
  const result = resolveInvitationState({ id: "inv1", state: "sent", expiresAt: PAST }, NOW);
  assert.deepEqual(result, { ok: false, reason: "expired" });
});

test("revoked, accepted and declined each have their own outcome", () => {
  for (const [state, reason] of [
    ["revoked", "revoked"],
    ["accepted", "already_accepted"],
    ["declined", "declined"],
  ] as const) {
    assert.deepEqual(resolveInvitationState({ id: "i", state, expiresAt: FUTURE }, NOW), { ok: false, reason });
  }
});

test("every failure reason has a message written for the recipient", () => {
  for (const reason of ["not_found", "expired", "revoked", "already_accepted", "declined"] as const) {
    const message = INVITATION_FAILURE_MESSAGE[reason];
    assert.ok(message.length > 0);
    assert.ok(!message.includes("error"), "an invitee is not a developer");
  }
});

test("no failure message pressures the recipient", () => {
  const text = Object.values(INVITATION_FAILURE_MESSAGE).join(" ").toLowerCase();
  for (const word of ["hurry", "act now", "urgent", "immediately", "last chance", "expires soon"]) {
    assert.ok(!text.includes(word), `the invitation says '${word}': fabricated urgency is forbidden`);
  }
});

console.log(`ok   deal-room invitation: ${passed} assertions passed`);
