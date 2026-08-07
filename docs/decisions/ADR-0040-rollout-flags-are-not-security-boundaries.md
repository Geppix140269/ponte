# ADR-0040: Rollout flags are not security boundaries

- **Status:** ACCEPTED
- **Date:** 2026-08-07
- **Owner decision:** Giuseppe Funaro, 7 August 2026, recorded as OD-E during
  Recovery Mode.
- **Reconciles** `docs/codex/FEATURE-FLAGS.md` with `lib/deal-room/flags.ts`.
- **Depends on** ADR-0036, which permits public explanation of the Deal Room.

---

## Why this exists

Two controls disagreed with their own documentation, in the direction that
matters.

`docs/codex/FEATURE-FLAGS.md`, dated 25 July 2026, states:

- `NEXT_PUBLIC_DEAL_ROOM` — *"Default when absent: Off"*, and *"never activated
  in production"*;
- `DEAL_ROOM_ALLOWLIST` — *"Empty or absent means **nobody**"*.

`lib/deal-room/flags.ts` inverted both on 1 August 2026 and documented the
inversion in its own header. Absent now means **on**. An empty allowlist now
means **everybody**.

So the canonical record described two controls failing closed while the code had
them failing open. Under the AGENTS.md Launch Mode test — *"causes an
access-control or publication control to fail open"* — that reads as a Launch
Blocker on its face, which is why it was escalated rather than silently
corrected.

It is not a Launch Blocker, because these were never the security boundary. But
the documentation said they were, and a control that is believed to be a
boundary will eventually be used as one.

## The decision

### 1. Public availability may fail open

**Deal Room explanation and discovery may fail open.** Naming the room,
explaining it, showing the walkthrough and reaching the public surfaces
permitted by ADR-0036 need no flag and lose nothing if a flag is absent.

### 2. Protected commercial actions may not rely on a flag

**Every protected commercial action must continue to rely on authentication,
permissions and RLS.** That means, without exception:

- entering a real room;
- seeing a real counterparty, real evidence or real terms;
- invitation, admission and the agreement gate;
- activation, payment and entitlement;
- every mutation in `app/[locale]/deal-rooms/actions.ts`.

The database is the boundary. `lib/deal-room/permissions.ts` already says of
itself that it is not a security boundary and that RLS is; that statement is
correct and is now authority.

### 3. Rollout flags are rollout flags

**A feature flag expresses staging intent, not entitlement.** It may decide
whether a surface is offered. It may never be the only thing standing between a
member and protected data or a chargeable act.

**Do not silently use rollout flags as security boundaries.** Where a flag is
the only control on something protected, that is a defect in the protected
thing, not a reason to harden the flag.

### 4. The documentation is reconciled to the code

`FEATURE-FLAGS.md` is corrected to state the real posture: both controls default
open, the open default is deliberate, and neither is a security boundary. The
code is not changed to match the stale document.

## What this does not authorise

- It does not relax admission, the Passport minimum or the verification
  threshold (ADR-0021 ruling 2).
- It does not make any protected surface public. ADR-0036 permits *explanation*;
  this ADR permits its *availability* to fail open. Participation is untouched.
- It does not retire the flags. Staged rollout remains useful, and
  `DEAL_ROOM_ALLOWLIST` remains available for narrowing when the owner wants it.

## Consequences

- `docs/codex/FEATURE-FLAGS.md` is updated in the same pull request as this ADR.
- A standing check is warranted: no protected mutation should be reachable when
  its flag is absent but RLS would allow it. That is verification work and is
  not authorised here.
- `NEXT_PUBLIC_FIND_JOURNEY` and `NEXT_PUBLIC_STRUCTURE_JOURNEY` govern nothing
  and are recorded as dead in the reconciled document.

## Alternatives rejected

**Re-invert the flags to fail closed.** Rejected by the owner. It would hide the
public explanation ADR-0036 exists to permit, and it would treat a rollout
control as the protection that RLS already provides.

**Classify as a Launch Blocker and stop.** Considered and rejected on the facts:
the protected actions were never gated by these flags, so nothing was failing
open that mattered. The defect was in the record, and the record is what changes.
