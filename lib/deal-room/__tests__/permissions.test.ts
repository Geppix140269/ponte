// Negative permission tests for the interface layer.
//
// Run: npx tsx lib/deal-room/__tests__/permissions.test.ts
//
// ## What this file can and cannot prove
//
// It proves the INTERFACE never offers an action it should not. It does not
// prove the database refuses one, because Row Level Security is the boundary
// and RLS can only be tested against a running Postgres.
//
// That distinction is not a hedge, it is the design: if this file and the
// policies ever disagree, the database wins and the user sees an error instead
// of a wrong screen. The live negative-access tests against the real policies
// are a Gate C verification step, listed in the ExecPlan, and the static
// contract between these vocabularies and the migration is asserted separately
// in `rls-contract.test.ts`.

import assert from "node:assert/strict";
import {
  canAcceptEvidence,
  canApproveProcedure,
  canCreateSubRoom,
  canInviteParticipant,
  canMutate,
  canOpenBlocker,
  canProposeProcedure,
  canReadRoom,
  canRequestClarification,
  canResolveBlocker,
  canSeeSubRoomPortfolio,
  canUploadEvidence,
  mutationBlockedReason,
  type RoomContext,
  type Viewer,
} from "../permissions";
import { PARTICIPANT_STATES, ROOM_STATES, type ParticipantState, type RoomState } from "../states";

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

const ACTIVE: RoomContext = { roomState: "active_procedure_agreed", entitlementState: "active" };

function viewer(overrides: Partial<Viewer> = {}): Viewer {
  return {
    profileId: "p1",
    participantId: "part1",
    participantClass: "principal",
    participantState: "admitted",
    subRoomId: "sub1",
    isRequiredApprover: false,
    isRoomAdministrator: false,
    isReviewer: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Acceptance criterion 4: nobody acts before admission
// ---------------------------------------------------------------------------

const PRE_ADMISSION: ParticipantState[] = ["invited", "prerequisites_pending", "terms_pending"];

for (const state of PRE_ADMISSION) {
  test(`a participant in '${state}' cannot act`, () => {
    const v = viewer({ participantState: state });
    assert.equal(canMutate(v, ACTIVE), false);
    assert.equal(canUploadEvidence(v, ACTIVE), false);
    assert.equal(canOpenBlocker(v, ACTIVE), false);
    assert.equal(canProposeProcedure(v, ACTIVE), false);
  });
}

test("terms_pending is the case that matters most", () => {
  // Every prerequisite done, NDA not accepted. Still outside the room.
  const v = viewer({ participantState: "terms_pending" });
  assert.equal(canMutate(v, ACTIVE), false);
  assert.match(mutationBlockedReason(v, ACTIVE)!, /Accept the Participation Agreement, the NDA and the room rules/);
});

for (const state of ["suspended", "removed", "withdrawn"] as ParticipantState[]) {
  test(`a '${state}' participant cannot act`, () => {
    assert.equal(canMutate(viewer({ participantState: state }), ACTIVE), false);
  });
}

test("removed and withdrawn participants cannot read either", () => {
  assert.equal(canReadRoom(viewer({ participantState: "removed" })), false);
  assert.equal(canReadRoom(viewer({ participantState: "withdrawn" })), false);
});

test("a suspended participant retains read access but not write", () => {
  const v = viewer({ participantState: "suspended" });
  assert.equal(canReadRoom(v), true);
  assert.equal(canMutate(v, ACTIVE), false);
});

test("a non-participant can do nothing at all", () => {
  assert.equal(canMutate(null, ACTIVE), false);
  assert.equal(canReadRoom(null), false);
  assert.equal(canSeeSubRoomPortfolio(null), false);
  assert.match(mutationBlockedReason(null, ACTIVE)!, /not a participant/);
});

test("only admitted and active may act, across the whole vocabulary", () => {
  const allowed = PARTICIPANT_STATES.filter((state) => canMutate(viewer({ participantState: state }), ACTIVE));
  assert.deepEqual([...allowed].sort(), ["active", "admitted"]);
});

// ---------------------------------------------------------------------------
// Acceptance criterion 15: read-only continuity
// ---------------------------------------------------------------------------

const NON_WRITABLE: RoomState[] = [
  "read_only",
  "closed",
  "completed",
  "paused",
  "withdrawn",
  "declined_before_activation",
  "cancelled_before_activation",
  "expired_before_activation",
];

for (const roomState of NON_WRITABLE) {
  test(`a room in '${roomState}' refuses every mutation`, () => {
    const context: RoomContext = { roomState, entitlementState: "active" };
    const v = viewer({ isRoomAdministrator: true, isReviewer: true, isRequiredApprover: true });
    assert.equal(canMutate(v, context), false);
    assert.equal(canUploadEvidence(v, context), false);
    assert.equal(canAcceptEvidence(v, context), false);
    assert.equal(canApproveProcedure(v, context), false);
    assert.equal(canCreateSubRoom(v, context), false);
    // Reading is untouched: that is the whole point of read-only continuity.
    assert.equal(canReadRoom(v), true);
  });
}

test("a lapsed entitlement stops writes without touching reads", () => {
  const context: RoomContext = { roomState: "active_procedure_agreed", entitlementState: "expired" };
  const v = viewer({ isRoomAdministrator: true });
  assert.equal(canMutate(v, context), false);
  assert.equal(canReadRoom(v), true);
  assert.match(mutationBlockedReason(v, context)!, /history stays readable/);
});

test("the reason names the entitlement, not the room, when the entitlement is the cause", () => {
  const context: RoomContext = { roomState: "active_procedure_agreed", entitlementState: "grace" };
  assert.equal(canMutate(viewer(), context), true, "grace still permits work");
});

test("a paused room says it is paused, not that it expired", () => {
  const context: RoomContext = { roomState: "paused", entitlementState: "active" };
  assert.match(mutationBlockedReason(viewer(), context)!, /paused/);
});

test("every room state is classified as writable or not, with no gaps", () => {
  for (const roomState of ROOM_STATES) {
    const context: RoomContext = { roomState, entitlementState: "active" };
    assert.equal(typeof canMutate(viewer(), context), "boolean");
  }
});

// ---------------------------------------------------------------------------
// Acceptance criterion 13: the sub-room portfolio
// ---------------------------------------------------------------------------

test("an admitted principal in a sub-room cannot see the portfolio", () => {
  assert.equal(canSeeSubRoomPortfolio(viewer({ participantClass: "principal", isRoomAdministrator: false })), false);
});

test("only a room administrator sees the portfolio", () => {
  assert.equal(canSeeSubRoomPortfolio(viewer({ isRoomAdministrator: true })), true);
});

test("a reviewer, an approver and a provider all fail the portfolio test", () => {
  for (const v of [
    viewer({ isReviewer: true }),
    viewer({ isRequiredApprover: true }),
    viewer({ participantClass: "provider" }),
  ]) {
    assert.equal(canSeeSubRoomPortfolio(v), false);
  }
});

// ---------------------------------------------------------------------------
// The permission matrix, section 5.2
// ---------------------------------------------------------------------------

test("only a required approver can approve a procedure", () => {
  assert.equal(canApproveProcedure(viewer({ isRequiredApprover: false }), ACTIVE), false);
  assert.equal(canApproveProcedure(viewer({ isRequiredApprover: true }), ACTIVE), true);
  // Being an administrator is not the same as being an approver.
  assert.equal(canApproveProcedure(viewer({ isRoomAdministrator: true }), ACTIVE), false);
});

test("accepting evidence needs the reviewer role, not merely principal standing", () => {
  assert.equal(canAcceptEvidence(viewer({ participantClass: "principal", isReviewer: false }), ACTIVE), false);
  assert.equal(canAcceptEvidence(viewer({ isReviewer: true }), ACTIVE), true);
});

test("an observer can do nothing but read", () => {
  const v = viewer({ participantClass: "observer" });
  assert.equal(canUploadEvidence(v, ACTIVE), false);
  assert.equal(canOpenBlocker(v, ACTIVE), false);
  assert.equal(canProposeProcedure(v, ACTIVE), false);
  assert.equal(canInviteParticipant(v, ACTIVE), false);
  assert.equal(canReadRoom(v), true);
});

test("a provider may contribute but not propose the procedure or invite", () => {
  const v = viewer({ participantClass: "provider" });
  assert.equal(canUploadEvidence(v, ACTIVE), true);
  assert.equal(canOpenBlocker(v, ACTIVE), true);
  assert.equal(canProposeProcedure(v, ACTIVE), false);
  assert.equal(canInviteParticipant(v, ACTIVE), false);
  assert.equal(canCreateSubRoom(v, ACTIVE), false);
});

test("a blocker is resolved by its owner or an administrator, not by anyone nearby", () => {
  assert.equal(canResolveBlocker(viewer({ participantId: "part1" }), ACTIVE, "part1"), true);
  assert.equal(canResolveBlocker(viewer({ participantId: "part1" }), ACTIVE, "part2"), false);
  assert.equal(canResolveBlocker(viewer({ participantId: "part1", isRoomAdministrator: true }), ACTIVE, "part2"), true);
});

test("clarification may be requested by a reviewer or a principal", () => {
  assert.equal(canRequestClarification(viewer({ participantClass: "principal" }), ACTIVE), true);
  assert.equal(canRequestClarification(viewer({ participantClass: "provider", isReviewer: true }), ACTIVE), true);
  assert.equal(canRequestClarification(viewer({ participantClass: "provider" }), ACTIVE), false);
});

test("every blocked mutation has a reason to show the member", () => {
  const cases: [Viewer | null, RoomContext][] = [
    [null, ACTIVE],
    [viewer({ participantState: "invited" }), ACTIVE],
    [viewer(), { roomState: "read_only", entitlementState: "active" }],
    [viewer(), { roomState: "active_procedure_agreed", entitlementState: "expired" }],
  ];
  for (const [v, context] of cases) {
    const reason = mutationBlockedReason(v, context);
    assert.ok(reason && reason.length > 0, "a disabled action with no explanation is DR-11's stated failure");
  }
});

test("a permitted mutation has no reason", () => {
  assert.equal(mutationBlockedReason(viewer(), ACTIVE), null);
});

console.log(`ok   deal-room permissions: ${passed} assertions passed`);
