# Ponte Trade Canonical Journey Register

**Status date:** 7 August 2026
**Authority position:** tier 2, beside `00-MASTER-IMPLEMENTATION-BRIEF.md`.
**Created under:** Recovery Mode, 7 August 2026, owner instruction.
**Governed by:** ADR-0037 (convergence), ADR-0038 (lifecycle), ADR-0039
(identifiers), ADR-0024 (two acts), and the Master Brief section 9 route and
screen register.

---

## 0. What this document is

A journey is not a list of screens. It is an **entry state, an objective, a path
through decisions, a set of endings, and a recorded outcome with a named next
owner.** This register holds all of that in one place so that no future
implementation has to reconstruct it from a conversation.

**No feature implementation may begin before its journey is registered here and
the register entry is approved by the owner.**

A register entry is not proof of implementation. Field 14 records the truth
about that separately, and it is the only field permitted to describe status.

---

## 1. The convergence rule

Recorded by **ADR-0037**. It governs every entry in this register.

> **Every journey that establishes credible bilateral commercial interest can
> converge on a Deal Room.**
>
> **A valid journey may instead end in:** watch, no-match, decline,
> do-not-proceed, investigation not confirmed, expiry, source unavailable, or
> continued monitoring.

**Can, never must.** Convergence is available and is chosen, never automatic.

**None of those endings is a failure.** Each is a valid completion and must be
designed, built and recorded as one: a named state, a recorded outcome, a next
owner. They are not error pages and they are never silence. Design Constitution
section 19 requires the full state set; this rule names the commercial endings
that belong to it.

**An accepted controlled introduction does not open a room** (ADR-0037). It
establishes credible commercial interest and completes the introduction. The
resulting surface *may offer* Create a Deal Room. A valid introduction may
continue as a commercial conversation without a room; a room becomes the next
action when the parties want structured transaction progression.

---

## 2. The canonical lifecycle

Recorded by **ADR-0038**.

```text
ENTER → DISCOVER → CREATE → TRUST → CONNECT → [DEAL ROOM] → PROGRESS → RECORD
```

- **Part one, discovery:** `ENTER → DISCOVER → CREATE → TRUST → CONNECT`
- **The hinge:** `[DEAL ROOM]` — a protected transition and environment, not a
  stage a member completes, and never drawn as the end
- **Part two, conduct:** `PROGRESS → RECORD`
- **`MANAGE` is cross-cutting** and never appears as a rail position
- **Three terminal states** (ADR-0024): moved to external signature, closed,
  ceased

Every entry below declares which lifecycle stages it traverses.

---

## 3. The identifier rule

Recorded by **ADR-0039**. The fifteen canonical route-family letters —
`E F S K I M D X G H B O T P A` — are **reserved permanently**. Implementation-local
identifiers use a prefix of two or more letters (`LP`, `RC`, `DR`) and must carry
a canonical mapping in field 4 of their journey entry. A local identifier never
overrides a canonical route family.

---

## 4. Register entry format

Every journey records sixteen fields. Fields 10, 11, 12 and 13 are mandatory and
may not be recorded as "to be decided".

| # | Field |
|---|---|
| 1 | Journey ID and name, **and the canonical Master Brief journey it restates** |
| 2 | Entry state — route, auth state, preconditions |
| 3 | User objective, in the member's words |
| 4 | Screen IDs traversed — canonical, plus implementation-local |
| 5 | Steps, ordered: surface and what the member does |
| 6 | Decision points — who decides, what they see, **what they must not see** |
| 7 | Evidence used — fact class per Master Brief section 3, with source, date, limitation |
| 8 | Authentication boundary — the exact step |
| 9 | Approval and disclosure boundary — what is disclosed, to whom, on whose approval |
| 10 | **Valid failure and non-success exits** |
| 11 | **Deal Room convergence condition**, or "none" |
| 12 | **Recorded outcome** — the named state, as the member sees it |
| 13 | **Next owner** — member, counterparty, Ponte Desk, reviewer, or nobody |
| 14 | Implementation status — absent, partial, implemented, flag-gated (+ flag) |
| 15 | Authority citations, as `file:line` |
| 16 | Approved design reference and conformity status |

---

## 5. Journey index

| ID | Journey | Restates | Register status |
|---|---|---|---|
| **JR-01** | Find to controlled introduction | **J04 + J08** | **Specified below** |
| JR-02 | Structure and submit a listing | J05 | Not yet specified. Built as `LP01`–`LP09` |
| JR-03 | Intelligent entry | J01 | Not yet specified. Entry console never built |
| JR-04 | Check or verify a business | J06 | Not yet specified |
| JR-05 | Investigate a Market Signal | J07 | Not yet specified |
| JR-06 | Create and activate a Commercial Mission | J02 | Not yet specified. Not built |
| JR-07 | Act on a Commercial Development | J03 | Not yet specified. Not built |
| JR-08 | Workspace return | J09 | Not yet specified |
| JR-09 | Admin and reviewer operation | J10 | Not yet specified |
| JR-10 | Deal Room conduct (part two) | no canonical J | Not yet specified. Governed by `PT-PRODUCT-2026-07-27-01` |

Specifying a journey in this register is a prerequisite for implementing it, not
a record that it was implemented.

---

# JR-01 — Find to controlled introduction

## 1. Identity

**JR-01, Find to controlled introduction.** Restates and chains the two canonical
journeys **J04** (*Find and request a Qualified Opportunity*) and **J08**
(*Controlled introduction*), Master Brief section 10.

**This journey is not new.** It was already in the merged authority as two named
journeys with a shared hinge. This entry chains them, adds the non-success exits
the Master Brief did not enumerate, and fixes the convergence condition.

**Lifecycle stages traversed:** `ENTER → DISCOVER → TRUST → CONNECT`, with
`[DEAL ROOM]` available but never automatic.

## 2. Entry state

- **Route:** `/find`
- **Auth state:** unauthenticated permitted, and normal
- **Preconditions:** none

## 3. User objective

> "Find someone credible on the other side of my trade, and reach them safely."

## 4. Screen IDs traversed

| Canonical | Local | Surface |
|---|---|---|
| F01 | — | Contextual first results |
| F02 / F03 | RC01 | Qualified Opportunity / Market Signal detail |
| X01 | RC02 | Action choice |
| O05 | RC03 | Request introduction — commercial fit |
| G01–G03 | — | Account boundary and resumption |
| O03 | RC04 | Interest request list, requester side |
| O04 | RC05, RC06 | Owner review, and counterparty fit summary |
| O06 | — | Introduction prerequisites |
| O07 | RC07 | Introduction completed, and room progression decision |
| T01 | — | Opportunity-specific thread |
| — | DR-01… | Deal Room, if chosen |

## 5. Steps

1. **Objective and entry.** Member arrives at `/find`, chooses a family, states
   what they need.
2. **Results, two lanes.** Qualified Opportunities and Market Signals are
   separated and never blended.
3. **Opportunity detail.** Decisive commercial facts first; dated evidence; an
   explicit statement of what remains unverified.
4. **Action choice.** Watch, investigate, or request an introduction.
5. **Commercial fit, before authentication.** Role, target, geography, reason.
6. **Account boundary.** Only on Send.
7. **Request submitted.**
8. **Owner review.** The owner sees the fit, not the requester's identity.
9. **Owner decision.** Accept, decline, or ask for clarification.
10. **Prerequisites.** The Deal Room-ready minimum, where a room is in view.
11. **Controlled introduction.** Disclosure approved and recorded; thread opens.
12. **Room progression decision.** Either party *may* choose to create a Deal
    Room. Nothing activates automatically.

## 6. Decision points

| Step | Who decides | What they see | What they must not see |
|---|---|---|---|
| 4 | Requester | Opportunity facts, evidence, limitations | Owner identity or contact |
| 9 | **Opportunity owner** | Role, target, geography, reason, capacity | **Requester identity, business name or contact** |
| 10 | Ponte / reviewer | Verification and admission state | Commercial terms |
| 11 | Both parties | Each other, on approval | Anything not approved for disclosure |
| 12 | Either principal | The offer to structure | The other party's private workspaces |

## 7. Evidence used

- **Qualified Opportunity** — reviewed commercial intent (Master Brief 3.1)
- **Market Signal** — unconfirmed indication, source and date shown, never
  presented as verified demand (ADR-0041)
- **Business Evidence** — evidence-specific only: what was checked, source,
  date, result, limitation, expiry. **No tier, no score, no percentage.** Gold
  is a brand signal and never a trust status.

## 8. Authentication boundary

**Exactly one, at step 6: submitting the interest request.** Everything before it
is free and anonymous. Work in progress is preserved across authentication and
resumes once, never twice.

Authenticating is not a navigation step for the purposes of the three-step
Deal Room depth rule.

## 9. Approval and disclosure boundary

- Requester identity is **withheld from the owner until the owner accepts**.
- On acceptance, contact details are disclosed to both parties and the
  disclosure is recorded.
- Documents are shared only by explicit selection and approval, never as a side
  effect of introduction.
- Ponte and AI may prepare and structure. They may not disclose, admit, waive or
  decide.

## 10. Valid failure and non-success exits

Each is a designed state with a recorded outcome and a next owner.

| Step | Exit | Named outcome |
|---|---|---|
| 1 | Unsupported or unsafe request | Explained, with a safe continuation |
| 2 | **No current qualified match** | States what was and was not found |
| 2 | Signals only, no opportunities | Offers watch or investigation |
| 3 | Expired / withdrawn | Record no longer available |
| 3 | **Source unavailable** | Distinguished from "not found" |
| 4 | **Watch** | Internal watch confirmed |
| 4 | **Continued monitoring** | Mission or watch active |
| 5 | Abandoned | Work preserved on the device |
| 5 | Self-match | Refused, plainly |
| 6 | Authentication failure | Work preserved, precise retry |
| 7 | Duplicate or rate-limited | Existing request shown |
| 8 | **Expiry** — owner never responds | Request expired, requester told |
| 9 | **Decline** | Declined; requester told without reason disclosure |
| 9 | **Clarification requested** | Awaiting requester |
| 10 | **Verification blocker** | Named blocker and its remedy |
| 10 | **Investigation not confirmed** | Not confirmed; absence distinguished from mismatch |
| 10 | **Do-not-proceed** | Recorded, with next owner Ponte |
| 11 | **No disclosure** | Introduction closed without disclosure |
| 11 | **Withdrawal** by either party | Recorded, thread closed |
| 12 | **No room** | **A valid ending, not a failure** |

## 11. Deal Room convergence condition

**Route 1 of `PT-PRODUCT-2026-07-27-01` section 4: an accepted controlled
introduction.**

Convergence requires all of:

1. the introduction was **accepted and disclosed** — verifiably, against a real
   accepted record;
2. **a party chooses** to structure the transaction (ADR-0037);
3. the proposing party satisfies the **Deal Room-ready minimum** (ADR-0021
   ruling 2).

Either principal may propose and sponsor the room. Nothing activates
automatically, and no charge occurs at convergence — preparing a room is free.

## 12. Recorded outcome

The named outcomes this journey can record:

- `Introduction request sent · awaiting owner review` (canonical J04 outcome)
- `Introduction accepted · contact disclosed`
- `Introduction declined`
- `Clarification requested`
- `Introduction expired`
- `Watching`
- `No qualified match`
- `Introduction complete · continuing as a conversation`
- `Deal Room proposed`

## 13. Next owner

| State | Next owner |
|---|---|
| Request sent | Opportunity owner |
| Clarification requested | Requester |
| Blocker open | Ponte / reviewer |
| Accepted, disclosed | Both parties |
| Declined, expired, no match | Nobody — journey closed |
| Watching | Ponte (monitoring) |
| Room proposed | Proposing principal |

## 14. Implementation status

| Step | Status |
|---|---|
| 1–3 Find, results, detail | **Implemented**, no flag |
| 4 Action choice | **Partial** — watch and investigate not offered here |
| 5–7 Interest, auth, submit | **Implemented.** Auth boundary already correct |
| 8 Owner review | **Implemented** at `/workspace`; identity correctly withheld |
| 9 Accept / decline | **Implemented.** **Clarify is ABSENT** — contradicts canonical O04 |
| 10 Prerequisites | **ABSENT.** ADR-0021 records the verification gate as not implemented |
| 11 Controlled introduction | **Partial** — completes as an email exchange only |
| 12 Room progression | **ABSENT.** No path from an accepted introduction to a room |
| Deal Room itself | **Implemented**, flag-gated (`NEXT_PUBLIC_DEAL_ROOM`, defaults open — ADR-0040) |

Known contradictions carried into the design brief: two express-interest UIs
(one dead), two unrelated meanings of "prerequisites", two unconnected meanings
of "controlled introduction", and `/deal-rooms/propose` bypassing its own
credible-interest gate (ADR-0037).

## 15. Authority citations

- `00-MASTER-IMPLEMENTATION-BRIEF.md` section 10, J04 and J08
- `00-MASTER-IMPLEMENTATION-BRIEF.md` section 9.2 (F), 9.8 (X), 9.9 (G), 9.12 (O), 9.13 (T)
- `PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md` sections 4, 5, 6, 9
- `ADR-0021` rulings 1, 2 and the pre-acceptance identity boundary
- `ADR-0037` convergence and the accepted introduction
- `ADR-0038` lifecycle
- `00-NORTH-STAR-ENTRY-ARCHITECTURE.md` sections 1, 3.1, 3.5
- `PONTE_DESIGN_CONSTITUTION_v1.md` sections 9, 14, 19

## 16. Approved design reference

**Set 3 — Respond and Connect**, `docs/ponte/design-reference/`, screens
`RC01`–`RC07` (formerly `A05`, `A06`, `D01`–`D04`).

**Conformity status: not yet conformed.** Set 3 predates ADR-0032, carries the
retired identifiers, and does not cover the non-success exits in field 10. The
Journey 1 design brief exists to close that gap.
