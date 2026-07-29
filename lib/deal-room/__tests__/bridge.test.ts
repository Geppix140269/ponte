// The Multi-party Deal Room Bridge model, against the owner's commission.
//
// Run: npx tsx lib/deal-room/__tests__/bridge.test.ts
//
// Issue #97 decision 2 lists ten states and a set of requirements. This file
// checks the ones that are decidable from the model rather than from pixels;
// the geometry is checked in `components/ponte/bridge/__tests__` and the
// rendering is evidenced visually.

import assert from "node:assert/strict";
import { BRIDGE_MILESTONES, BRIDGE_STATES, bridgeAriaLabel, bridgeModel, type BridgeInput } from "../bridge";

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

const BASE: BridgeInput = {
  roomState: "active_procedure_agreed",
  procedureApproved: true,
  procedureProposed: true,
  counterpartyAdmitted: true,
  invitationSent: true,
  anyEvidenceSubmitted: false,
  completion: 22,
  momentum: "moving",
  openBlockers: [],
  participants: [
    { role: "Seller", principal: true, state: "joined", ownsNextAction: false },
    { role: "Buyer", principal: true, state: "joined", ownsNextAction: true },
  ],
  nextAction: { label: "Agree the product specification", owner: "Both principals" },
};

// ---------------------------------------------------------------------------
// The commissioned states
// ---------------------------------------------------------------------------

test("all ten commissioned states exist", () => {
  assert.deepEqual([...BRIDGE_STATES].sort(), [
    "awaiting_counterparty_admission",
    "blocked",
    "counterparty_admitted",
    "credible_interest_confirmed",
    "evidence_in_progress",
    "procedure_agreed",
    "procedure_proposed",
    "read_only",
    "ready_to_proceed",
    "room_proposed",
  ]);
});

test("blocked and read-only are conditions, not stations on the deck", () => {
  const drawn = BRIDGE_MILESTONES.map((m) => m.state);
  assert.ok(!drawn.includes("blocked"), "a blocked room is still at the milestone it reached");
  assert.ok(!drawn.includes("read_only"));
  assert.equal(drawn.length, 8);
});

test("the milestone order is the progression order", () => {
  assert.deepEqual(BRIDGE_MILESTONES.map((m) => m.state), [
    "credible_interest_confirmed",
    "room_proposed",
    "awaiting_counterparty_admission",
    "counterparty_admitted",
    "procedure_proposed",
    "procedure_agreed",
    "evidence_in_progress",
    "ready_to_proceed",
  ]);
});

// ---------------------------------------------------------------------------
// Position on the deck
// ---------------------------------------------------------------------------

const AT = (state: string) => BRIDGE_MILESTONES.findIndex((m) => m.state === state);

test("a draft room sits at credible interest", () => {
  const model = bridgeModel({
    ...BASE,
    roomState: "draft",
    procedureApproved: false,
    procedureProposed: false,
    counterpartyAdmitted: false,
    invitationSent: false,
  });
  assert.equal(model.at, AT("credible_interest_confirmed"));
});

test("an invitation sent but not accepted sits at awaiting admission", () => {
  const model = bridgeModel({
    ...BASE,
    roomState: "awaiting_principal_admission",
    procedureApproved: false,
    procedureProposed: false,
    counterpartyAdmitted: false,
  });
  assert.equal(model.at, AT("awaiting_counterparty_admission"));
});

test("an approved procedure with no evidence sits at procedure agreed", () => {
  assert.equal(bridgeModel(BASE).at, AT("procedure_agreed"));
});

test("evidence submitted advances to evidence and conditions", () => {
  assert.equal(bridgeModel({ ...BASE, anyEvidenceSubmitted: true }).at, AT("evidence_in_progress"));
});

test("a blocked room stays at the milestone it reached", () => {
  const model = bridgeModel({
    ...BASE,
    anyEvidenceSubmitted: true,
    roomState: "blocked",
    openBlockers: [{ title: "Sampling point not agreed", category: "critical" }],
  });
  assert.equal(model.at, AT("evidence_in_progress"), "blocking must not move the room backwards or forwards");
  assert.equal(model.condition, "blocked");
});

test("ready to proceed is the final station", () => {
  const model = bridgeModel({ ...BASE, roomState: "ready_to_proceed", anyEvidenceSubmitted: true });
  assert.equal(model.at, BRIDGE_MILESTONES.length - 1);
});

// ---------------------------------------------------------------------------
// Acceptance criterion 7, in the model
// ---------------------------------------------------------------------------

test("no completion value before the procedure is approved, even if one is passed in", () => {
  const model = bridgeModel({ ...BASE, procedureApproved: false, completion: 47 });
  assert.equal(model.completion, null, "a caller's number must be discarded until the procedure governs");
});

test("the completion value passes through once the procedure governs", () => {
  assert.equal(bridgeModel(BASE).completion, 22);
});

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

test("read-only outranks a blocker", () => {
  const model = bridgeModel({
    ...BASE,
    roomState: "read_only",
    openBlockers: [{ title: "X", category: "critical" }],
  });
  assert.equal(model.condition, "read_only");
});

test("only a critical blocker sets the blocked condition", () => {
  assert.equal(bridgeModel({ ...BASE, openBlockers: [{ title: "X", category: "material" }] }).condition, "none");
  assert.equal(bridgeModel({ ...BASE, openBlockers: [{ title: "X", category: "critical" }] }).condition, "blocked");
});

test("the named blocker is the one with the greatest impact", () => {
  const model = bridgeModel({
    ...BASE,
    openBlockers: [
      { title: "Operational thing", category: "operational" },
      { title: "Critical thing", category: "critical" },
      { title: "Material thing", category: "material" },
    ],
  });
  assert.equal(model.blocker?.title, "Critical thing");
});

// ---------------------------------------------------------------------------
// Privacy: the bridge is handed a filtered list
// ---------------------------------------------------------------------------

test("the model contains only the participants it was given", () => {
  const model = bridgeModel({ ...BASE, participants: [BASE.participants[0]] });
  assert.equal(model.participants.length, 1);
});

test("the model has no field that could carry an unseen workspace", () => {
  const model = bridgeModel(BASE);
  const keys = Object.keys(model).sort();
  assert.deepEqual(keys, ["at", "blocker", "completion", "condition", "momentum", "nextAction", "participants"]);
  // No subRooms, no counts, no ids: nothing a viewer could infer another
  // private workspace from.
  const text = JSON.stringify(model).toLowerCase();
  assert.ok(!text.includes("sub_room") && !text.includes("subroom"));
});

test("at most one participant owns the next action", () => {
  const model = bridgeModel(BASE);
  assert.equal(model.participants.filter((p) => p.ownsNextAction).length, 1);
});

// ---------------------------------------------------------------------------
// The accessible sentence
// ---------------------------------------------------------------------------

test("the label names the current stage, the next stage and the caveat", () => {
  const label = bridgeAriaLabel(bridgeModel(BASE));
  assert.match(label, /Current stage: Procedure agreed, stage 6 of 8/);
  assert.match(label, /Next stage: Evidence and conditions/);
  assert.match(label, /Later stages are not guaranteed/);
});

test("the final stage says what it does not mean", () => {
  const label = bridgeAriaLabel(bridgeModel({ ...BASE, roomState: "ready_to_proceed", anyEvidenceSubmitted: true }));
  assert.match(label, /does not mean a contract, payment or shipment has happened/);
});

test("the label states the blocker when there is one", () => {
  const label = bridgeAriaLabel(
    bridgeModel({ ...BASE, openBlockers: [{ title: "Sampling point not agreed", category: "critical" }] }),
  );
  assert.match(label, /blocked: Sampling point not agreed/);
});

test("the label states read-only and that history is preserved", () => {
  const label = bridgeAriaLabel(bridgeModel({ ...BASE, roomState: "read_only" }));
  assert.match(label, /read-only/);
  assert.match(label, /history is preserved/);
});

test("the label carries no percentage before approval", () => {
  const label = bridgeAriaLabel(bridgeModel({ ...BASE, procedureApproved: false, completion: 47 }));
  assert.ok(!label.includes("per cent"), "a screen-reader user must not hear a number a sighted user cannot see");
});

test("the label names who owns the next action", () => {
  assert.match(bridgeAriaLabel(bridgeModel(BASE)), /Buyer owns the next action/);
});

console.log(`ok   deal-room bridge: ${passed} assertions passed`);
