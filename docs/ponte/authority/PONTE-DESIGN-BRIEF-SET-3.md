# Ponte — Design brief, Set 3

**For:** Claude Design
**From:** UX/UI Director
**Date:** 2 August 2026
**Authority:** canonical authority v5.2
**Capability:** respond and connect. The half of the marketplace no document covered until this week.

**This is the last set before the hold.** `DECISION-25` holds Design after Set 3, ahead of the Deal Room sets, until the database reconciliation report exists. Reusable visual-system work may continue during the hold. Room behaviour and schema assumptions may not be invented.

Set 3 uses the Set 1 and Set 2 patterns and does not change them.

---

## Deliver

390px, dark and light, empty, loading and error states drawn, as before. Seven surfaces.

---

## 1 · `A05` Market Record Detail — **two distinct record types, never conflated**

This is the sharpest requirement in the set.

A **Market Signal** and a **member opportunity** are different objects with different provenance. They may share a visual pattern. Their **provenance, verification state and honesty copy must remain visibly distinct**, so that a user is never in doubt which one they are reading.

| | Market Signal | Member opportunity |
|---|---|---|
| Where it came from | Read from a named public source | Published by a Ponte member |
| Confirmed? | **No. Nothing has been confirmed with the party named in it, and nobody behind one is a Ponte member.** | Passed automated screening |
| Reference | `PONTE-SUP-#######` or `EXT-######` | `PT-####` |
| Facts held | 2-digit HS chapter, quantity, origin **or** destination, delivery term, read date | The family's full published schema |
| What you can do | **Ask Ponte to investigate, $49** | Express interest, free |

The signal disclaimer is correct as it stands on the live site and is not to be softened.

## 2 · `A06` Action Choice

Turn a relevant record into the right next move. The available actions differ by record type, per the table above. Do not offer "express interest" on a signal.

## 3 · `D01` Investigation or Interest Request — two variants

**Interest, on a member opportunity.** Free. Requires **sign-in and verified contact only. Business verification must not be required here**, per `DECISION-09`; gating the response side kills the scarce half of the marketplace.

The respondent submits a short **structured statement**: capacity, relevance, and what they can fulfil.

**Stated before sending, on this screen, not after:**

> If the owner accepts your interest, your company identities will be revealed to each other.

**Investigation, on a Market Signal.** **$49.** Defined deliverable, and the copy describes this and nothing more: a source and freshness check · a result of confirmed, not confirmed, or unable to confirm · an evidence and source trail · a recommended next action.

> Payment buys the investigation, not a guaranteed opportunity, response or introduction.

## 4 · `D02` Request Status — three honest states

**Scope.** The Pending, Lapsed and Accepted states below apply **only to interest in a member opportunity**. They do **not** describe a Market Signal investigation. A paid investigation has no owner to accept it and a different lifecycle entirely. **No investigation-status or investigation-result lifecycle beyond the purchase commitment defined at `D01` is to be invented in Set 3.**

| State | Behaviour |
|---|---|
| **Pending** | Shown plainly. Withdrawal offered at any time. The owner receives measured reminders. **Ponte does not promise that an owner will reply, and no copy may imply otherwise.** |
| **Lapsed** | The listing expired or was closed. Said plainly, not left silent. |
| **Accepted** | Carries the mutually disclosed information and the **Create Deal Room** action. This is a state, **not a messaging product.** No free private messaging is introduced in v1 under this or any label. |

## 5 · `D02` owner-side acceptance variant — informed disclosure

**This is not a new canonical screen ID.** It is the required owner-side acceptance variant of `D02`.

Acceptance is a disclosure action, not a generic button. **Before accepting**, the owner sees exactly what acceptance releases:

- both company identities, disclosed **mutually**
- the precise private fields being opened
- **the respondent's intermediary status, restated prominently** so it cannot be missed at the moment identity is given

The consequence is written on the primary control itself, not in a tooltip and not after the fact.

Secondary actions: decline, and require business verification first. The owner may require it before revealing sensitive fields or admitting to a room, at their discretion, not as a system default.

## 6 · `D03` Counterparty Fit Summary

Why progression may or may not be worthwhile. **Both parties see what Ponte checked and what remains unproved.** Never a guarantee, never a score, never a claim of comprehensive screening. `DECISION-19` forbids implying the checks are exhaustive or that a counterparty is safe.

**This is an R2 surface.** The Momentum event catalogue maps `credible_interest_confirmed` to R2. All five elements, and the reference wording is *"Explain why the counterparty path is credible and what remains unknown."* Next action: prepare the Deal Room.

## 7 · `D04` Deal Room Progression Decision

The commercial transition into the controlled layer.

**Idempotent.** Either party may initiate. The respondent initiates from the accepted state of `D02`; the owner from the accepted interest. **Both routes carry the same accepted-interest ID and create one room.** A second room from the same accepted interest requires both parties to agree explicitly.

One listing may still produce several rooms with **different** respondents, per `DECISION-04`. The idempotency is per accepted interest, not per listing.

Everything from the listing carries into the room. **Nothing is re-entered.**

---

## Three families

All seven surfaces serve product, trade service, and distribution and representation. The field sets differ per the family schemas. The structure does not.

For distribution, the respondent's **position** is material to fit and must be visible on `D03`: a principal seeking a distributor and a distributor seeking brands are counterparties, not peers.

---

## Gating variants — draw all four

The interest and investigation actions are not always available. Each state must be drawn, and each must say what to do next rather than simply disabling a control.

| Variant | Behaviour |
|---|---|
| **Signed out** | What is public is readable. The action states what signing in unlocks. |
| **Signed in, contact not verified** | Names the single missing step and the route to complete it. Not a wall. |
| **Contact verified, eligible** | The full action. Business verification is **not** required to express interest. |
| **Payment unavailable or unsuccessful**, $49 investigation | The signal and its facts are untouched. The failure is named, nothing is charged, and the route back is offered. |

---

## Rules

No boxes. One primary action per screen. Tap and voice first, typing always available. Back never loses work. One segmented progress rule, no numeral. 48px minimum, 64px choice rows. Every tap acknowledged inside 100ms.

Retention copy, verbatim where relevant: *"Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device."* Signed in: 90 days from last meaningful edit.

Never claim comprehensive screening. Never promise a reply. Never promise an investigation outcome.

---

## Review

All of Set 3, both themes, all states, at 390px, to Giuseppe. Then Design holds.
