# Journey 1 — bounded design brief for Claude Design

**Journey:** JR-01, Find to controlled introduction
**Issued:** 7 August 2026, under Recovery Mode
**Authority:** `docs/ponte-authority/00-CANONICAL-JOURNEY-REGISTER.md`, entry JR-01
**Deliverable:** one connected, clickable journey prototype
**Approver:** Giuseppe Funaro. Claude Code receives no implementation brief until
this prototype is approved.

---

## 1. What you are designing

The complete human journey from a visitor arriving with a trade need, to two
parties introduced and able to speak — and, if they choose it, to the threshold
of a Deal Room.

**This is one connected journey, not a set of screens.** The thing being
approved is whether a real person can walk it end to end without explanation. A
deck of beautiful states that do not connect is a failure of this brief.

## 2. Scope

**In scope:** JR-01 steps 1 to 12 as specified in the register, including every
non-success exit in field 10.

**Out of scope, and not to be designed, implied or "improved" here:**

- the listing path (`LP01`–`LP09`) — a different journey, already built
- the inside of a Deal Room — JR-10, not yet specified
- activation, payment, pricing surfaces
- admin and reviewer surfaces
- the landing page
- verification as a product

**You have no authority to redesign the product.** A prototype validates a
direction. Per Master Brief section 1.2 it does **not** silently authorise a
database model, a permission rule, a new lifecycle, contact disclosure,
automatic publication, automatic verification, a payment obligation or an
external AI action. If the journey seems to need one of those, stop and say so.

## 3. The journey, as approved

Twelve steps, with the canonical and local screen IDs. The full specification —
decision points, evidence, outcomes, next owners — is JR-01 fields 5 to 13. Read
it; do not work from this table alone.

| # | Step | Canonical | Local |
|---|---|---|---|
| 1 | Objective and entry | F01 | — |
| 2 | Results, two lanes | F01 | — |
| 3 | Opportunity detail | F02 / F03 | RC01 |
| 4 | Action choice | X01 | RC02 |
| 5 | Commercial fit | O05 | RC03 |
| 6 | Account boundary | G01–G03 | — |
| 7 | Request submitted | O03 | RC04 |
| 8 | Owner review | O04 | RC05 |
| 9 | Owner decision | O04 | RC06 |
| 10 | Prerequisites | O06 | — |
| 11 | Controlled introduction | O07 | RC07 |
| 12 | Room progression decision | O07 → DR | RC07 |

**Use `RC01`–`RC07`.** The old `A05`, `A06`, `D01`–`D04` identifiers are retired
by ADR-0039 because they collided with canonical route families. Do not
reintroduce them.

## 4. The two boundaries that must be visible in the design

These are the journey's spine. If a reviewer cannot see them in the prototype,
the prototype is not finished.

**The authentication boundary is at step 6, and nowhere else.** Steps 1 to 5 are
free and anonymous, including the whole commercial-fit form. A member types their
fit, and only when they press Send are they asked who they are. Work in progress
survives authentication and resumes once. Value before registration is not a
nicety here; it is North Star section 3.1.

**The identity boundary holds until step 9 accept.** The opportunity owner
decides **without seeing who the requester is** — role, target, geography and
reason, never a name, business or contact. The design must make it obvious to
the owner that they are deciding on fit, and obvious to the requester that their
identity is withheld until acceptance. Disclosure is an act, and it must look
like one.

## 5. Non-success exits are first-class

Every exit in JR-01 field 10 must exist as a designed state and be reachable in
the prototype. **Decline, expiry, no match, blocker, no disclosure, withdrawal
and "no room" are valid endings, not errors.**

Three that are routinely got wrong and will be checked specifically:

- **No qualified match** must state what *was* and *was not* found. Never an
  empty page, never a shrug.
- **Source unavailable** must be distinguishable from *not found* and from *not
  confirmed*. Three different truths.
- **"Continuing as a conversation"** — an introduction that never becomes a
  room — must read as a **success**. Per ADR-0037 this is a correct ending, and
  if the design makes it feel like a dead end it contradicts the authority.

Design Constitution section 19 requires the full state set: loading, empty,
incomplete, ambiguous, error, blocked, waiting, resumed, completed, expired,
withdrawn. A happy-path-only journey is not complete.

## 6. Binding design authority

- **`design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` v1.1** — in particular
  section 9 progress, 11 navigation, 12 buttons, 14 records and evidence, 17
  responsive, 18 accessibility, 19 state completeness, 23 prohibited
  substitutions
- **ADR-0032 and Amendments 1 and 2** — the bridge is the interface. This is the
  surface language: dark ink ground for building, cream for the public market,
  bronze doing one job, scale carrying the drama, motion as passage
- **ADR-0038** — the lifecycle. JR-01 traverses `ENTER → DISCOVER → TRUST →
  CONNECT`. The rail carries journey positions only, never navigation, and
  **`MANAGE` is not a stage**
- **ADR-0024** — the rail must not draw `[DEAL ROOM]` as the end. It is the
  middle

**Approved references:** Set 3 *Respond and Connect* (the closest existing work,
but it predates ADR-0032, carries retired IDs and omits the exits — treat as
state coverage, not as surface language); `bridge/ponte-signed-in.html`;
`bridge/ponte-deal-room.html`.

## 7. Language and truth rules

- **Evidence-specific trust only.** What was checked, source, date, result,
  limitation, expiry. **No tiers, no score, no percentage, no completeness bar.**
  Gold is a brand signal and never a status.
- **Market Signals are never dressed as Qualified Opportunities.** Read from a
  named public source, republished as printed, not confirmed with the party
  named, not a member of Ponte (ADR-0041).
- **No fabricated traction.** No invented counts, volumes, activity or urgency.
  Thin inventory is described honestly.
- **A Deal Room is activated, never published.**
- **Canonical terminology** per Master Brief section 8.4. "Listing" only where
  the schema forces it.
- **No dead doors.** Do not draw a control that performs something the product
  cannot do. Where you believe a control is needed and the capability does not
  exist, mark it and raise it rather than drawing it as live.

## 8. Deliverable

One connected clickable prototype in which a reviewer can:

1. walk steps 1 to 12 as a requester, without explanation;
2. walk steps 8 and 9 as the opportunity owner;
3. reach **every** non-success exit in JR-01 field 10;
4. see both boundaries in section 4 behave correctly.

Required coverage:

- **390 × 844 and desktop**
- **reduced motion** and **keyboard focus** states
- both auth states where the journey has them

## 9. What to raise rather than resolve

Bring these back rather than designing around them. Each is a known gap, already
recorded, and none is yours to close:

- **Clarify does not exist.** Canonical O04 requires *accept, decline or ask for
  clarification*; only accept and decline are built. Design it — and flag that it
  needs implementation.
- **Prerequisites (step 10) are not implemented.** ADR-0021 records the
  verification gate as absent.
- **There is no path from an accepted introduction to a room.** Step 12 is the
  gap JR-01 exists to close.
- Two express-interest UIs exist, one dead; "prerequisites" means two unrelated
  things; "controlled introduction" means two unconnected mechanisms.

## 10. Approval gate

Completion of this journey requires all three, per the owner's Recovery Mode
instruction:

1. **functional proof**;
2. **design-conformity proof**;
3. **Giuseppe completing the end-to-end journey in a preview without
   explanation.**

The third is the real test. If the journey has to be narrated, it is not done.
