# ADR-0024: The Ponte Trade journey has two parts, and a defined end

- Status: ACCEPTED
- Date: 2026-08-01
- Owner statement, recorded the moment it was made.

## The decision, in the owner's words

> The Deal Room is the beginning of the second part of the real journey. The
> landing page is the discovery part. The end of the Ponte Trade journey is when
> a Deal Room moves out to contract signature external, or a Master Deal Room is
> closed or ceases to exist.

## What that fixes in the product's model

**The journey is one arc in two acts, not a list of screens.**

- **Part one — discovery.** It begins at the entrance. The landing page is this
  part, not a preamble to it. Its work is to bring a member from arriving to
  having a credible counterparty.
- **The hinge — the Deal Room.** Opening a room is not the last stage of part
  one. It is the **first stage of part two**. Everything before it was finding
  and qualifying; everything after it is conducting.
- **Part two — conduct.** The room, its procedure, its evidence, its decisions.

**The journey has a defined end, and Ponte is not it.** The arc terminates when
one of three things happens:

1. the Deal Room moves out to **contract signature, externally**;
2. a Master Deal Room is **closed**;
3. a Master Deal Room **ceases to exist**.

Ponte carries a deal to the point of signature and stops. Signature happens
elsewhere. A journey model that ends at "signed" would claim a step Ponte does
not perform, and would be the manufactured completion the Constitution forbids.

## What this binds

**A member can always see where they are.** The journey is visible on every
Desk surface, including the landing. The previous rule — that the landing shows
no rail because "nothing has started" — is superseded. A first-time visitor
seeing the whole arc, positioned at its beginning, is being told what Ponte is;
that is the opposite of a claim about their progress.

**The Deal Room is drawn as the hinge, not as the destination of a funnel.** A
rail that ends at ROOM tells a member the room is the finish. It is the middle.

**Terminal states are named, not implied.** Moved to external signature, closed,
and ceased are three different endings and are recorded as three, in the same
way `deal_room_period_lifecycle` already distinguishes expiry from closure.

## Open, and to be confirmed by the owner

The stage vocabulary in the design package is
`ENTER · DISCOVER · CREATE · MANAGE · TRUST · CONNECT · PROGRESS · RECORD · ROOM`.
This ADR fixes the two-act shape and the three endings. It does **not** yet fix
which of those stages sit in part one and which sit inside the room — the
implementation reading is that ENTER through CONNECT are discovery, ROOM opens
part two, and PROGRESS and RECORD occur within it. That reading is written here
so it can be corrected in one line rather than discovered in a rebuild.

## Why this document exists at all

Twice today an owner decision that lived only in conversation was lost and
rebuilt wrongly: ADR-0022 for the landing, ADR-0023 for member input. This was
written within minutes of being stated, for that reason.

The rule those three share: **if it matters, it is in `docs/decisions/`, and it
says what must remain, not only what to change.**
