# ADR-0037: The convergence rule, and what an accepted introduction does

- **Status:** ACCEPTED
- **Date:** 2026-08-07
- **Owner decision:** Giuseppe Funaro, 7 August 2026, recorded as OD-B and the
  additional Journey-1 ruling during Recovery Mode.
- **Records for the first time** the convergence rule that several authorities
  assumed but none stated.
- **Does not touch** ADR-0020, the admission gate, or the pricing model.

---

## Why this exists

Two things were missing from the merged record.

**First, the convergence rule was never written down.** ADR-0021 ruling 5 and
the North Star's 31 July amendment both say that *"everything converges on the
Deal Room"* is a claim about the funnel rather than navigation — but neither
states what convergence actually requires, and neither enumerates the endings a
journey may legitimately reach instead. A journey model with one ending is a
funnel that treats every other outcome as a failure, and Ponte's Design
Constitution section 19 already forbids exactly that.

**Second, the product had two unconnected mechanisms both called "controlled
introduction".** Accepting an expression of interest sends two emails
(`sendConnectAccepted`) and stops. The Deal Room has a separate invitation and
admission model. No code path carries an accepted introduction into a room;
`INTEREST_ROUTES.accepted_introduction` exists but is an unverified default on a
form. Whether acceptance was supposed to *open* a room had never been decided,
so the gap was never closed.

## The decision

### 1. The convergence rule

> **Every journey that establishes credible bilateral commercial interest can
> converge on a Deal Room.**
>
> **A valid journey may instead end in:** watch, no-match, decline,
> do-not-proceed, investigation not confirmed, expiry, source unavailable, or
> continued monitoring.

**"Can" is the operative word.** Convergence is available, never automatic and
never obligatory.

**None of the listed endings is a failure.** They are valid completions and must
be designed, built and recorded as such — named states with a recorded outcome
and a next owner, not error pages, dead ends or silence. Constitution section 19
already requires the state set; this rule names the commercial endings that
belong to it.

### 2. What an accepted controlled introduction does

**An accepted controlled introduction does not automatically open a Deal Room.**

It does two things, and only these:

1. it **establishes credible commercial interest** — which is the precondition
   `PT-PRODUCT-2026-07-27-01` section 4 requires before a room may be proposed
   at all; and
2. it **completes the introduction** — disclosure occurs, and the parties can
   speak.

**The resulting surface may offer "Create a Deal Room" as the natural next
action.** Either appropriate party may choose to proceed.
`PT-PRODUCT-2026-07-27-01` section 4 and ADR-0021 ruling 1 already establish
that either principal may propose and sponsor a master room; this ADR adds no
new right and takes none away.

**Nothing activates automatically.** No room is created, no participant row is
written, no entitlement is consumed and no charge occurs as a consequence of
acceptance.

### 3. A controlled introduction is complete without a room

**A valid introduction may continue as a commercial conversation without a
room.** Two parties who have been introduced, are talking, and never open a room
have completed the journey correctly. That outcome is recorded as a success.

**A Deal Room becomes the next action when the parties want structured
transaction progression** — an agreed procedure, held evidence, staged decisions
and a durable record. Wanting those things is the trigger. Nothing else is.

## What this binds

- **`accepted_introduction` must mean it.** Where a route claims an accepted
  introduction as its basis for credible commercial interest, that acceptance
  must be verifiable against a real accepted record. A free-text default on a
  form does not satisfy this rule.
- **`/deal-rooms/propose` currently contradicts this ADR.** It passes the
  literals `counterpartyProfileId: "pending"` and a placeholder objective in
  order to pass its own `assessCredibleInterest` gate. That is the gate being
  bypassed at the only place it is used. Recorded here; correction is
  implementation work and is not authorised by this ADR.
- **Every journey in the Canonical Journey Register must declare** its Deal Room
  convergence condition, or state "none", and must enumerate its valid
  non-success exits from the list in rule 1.
- **The offer to create a room is a control**, so North Star section 3.5 applies:
  it appears only where a member can actually arrive.

## What this does NOT change

- The room entry routes in `PT-PRODUCT-2026-07-27-01` section 4 are unchanged.
  An accepted controlled introduction remains route 1 of six.
- The admission gate, the Deal Room-ready Passport minimum and the verification
  threshold (ADR-0021 ruling 2) are unchanged and still apply to anyone entering
  a room.
- Pricing is unchanged. Preparing a room remains free; activation remains the
  paid event (ADR-0020, ADR-0028).
- Whether identity disclosure sits inside or before the room, beyond the
  introduction disclosure this ADR describes, remains open exactly as ADR-0021
  left it.

## Alternatives rejected

**Acceptance opens a room automatically.** Rejected by the owner. It would
charge structure at a moment when the parties have only agreed to talk, and it
would make a room out of every introduction, including the many that should stay
a conversation.

**Acceptance may never lead to a room.** Not proposed by anyone; it would strand
the journey at an email exchange, which is the defect this ADR exists to name.
