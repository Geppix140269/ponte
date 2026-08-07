# ADR-0038: The canonical journey lifecycle

- **Status:** ACCEPTED
- **Date:** 2026-08-07
- **Owner decision:** Giuseppe Funaro, 7 August 2026, recorded as OD-C during
  Recovery Mode.
- **Closes** the open question left explicitly unresolved at the end of
  **ADR-0024**.
- **Does not touch** ADR-0024's two-act shape or its three named endings.

---

## Why this exists

ADR-0024 fixed the shape of the journey — two acts, hinged on the Deal Room,
with three terminal states — and then deliberately stopped:

> The stage vocabulary in the design package is
> `ENTER · DISCOVER · CREATE · MANAGE · TRUST · CONNECT · PROGRESS · RECORD · ROOM`.
> This ADR fixes the two-act shape and the three endings. It does **not** yet fix
> which of those stages sit in part one and which sit inside the room. That
> reading is written here so it can be corrected in one line rather than
> discovered in a rebuild.

It was never corrected, and the rail cannot be designed without it.

## The decision

**The canonical lifecycle is:**

```text
ENTER → DISCOVER → CREATE → TRUST → CONNECT → [DEAL ROOM] → PROGRESS → RECORD
```

**`MANAGE` is cross-cutting, not a chronological stage.** It is removed from the
sequence. Managing a record, a mission or a room happens throughout and belongs
to no single position, so it must never occupy a slot on a journey rail.

**The Deal Room is the protected transition and environment between `CONNECT`
and `PROGRESS`.** It is drawn as a threshold, not as a terminus.

## How this differs from the reading ADR-0024 wrote down

ADR-0024's provisional reading was *"ENTER through CONNECT are discovery, ROOM
opens part two, and PROGRESS and RECORD occur within it."* That reading is
**confirmed**, with two corrections:

1. `MANAGE` is removed from the sequence entirely rather than assigned to a
   part.
2. The room is named `[DEAL ROOM]` and described as a **transition and
   environment**, not a stage like the others. A member does not "complete" the
   Deal Room stage; they cross into it and then work inside it.

## What this binds

- **Part one is `ENTER → DISCOVER → CREATE → TRUST → CONNECT`.** This is
  discovery: arriving, finding, structuring a record, establishing evidence, and
  reaching a credible counterparty.
- **Part two is `PROGRESS → RECORD`**, and it occurs inside the room.
- **The rail carries journey positions only**, as the North Star already
  requires. It is never navigation, and `MANAGE` never appears on it.
- **A rail must not present `[DEAL ROOM]` as the end.** ADR-0024 is explicit
  that a rail ending at ROOM tells a member the room is the finish, and it is
  the middle.
- **Crossing into the room is not automatic**, per ADR-0037. A journey may end
  validly at `CONNECT`.
- **The three terminal states of ADR-0024 are unchanged**: moved to external
  signature, closed, ceased. `RECORD` is not a fourth ending; it is the stage in
  which the durable history is kept.

## Consequences

- `lib/desk/journey.ts` is the existing rail contract and will need to express
  this lifecycle. That is implementation and is not authorised by this ADR.
- Any surface currently showing `MANAGE` as a rail position is wrong and must be
  corrected when next touched.
- The Canonical Journey Register records, for every journey, which lifecycle
  stages it traverses.

## Alternatives rejected

**Keep `MANAGE` in the sequence.** Rejected. It is an activity, not a position,
and placing it chronologically forces every rail to imply that management stops
once it is passed.

**Treat the Deal Room as an ordinary stage.** Rejected, and already rejected by
ADR-0024 for the same reason: it makes the hinge look like a destination.
