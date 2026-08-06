# ADR-0030: The first-activation waiver is not a launch requirement

- **Status:** ACCEPTED
- **Date:** 2026-08-06
- **Owner decision**, 6 August 2026: *"If the waiver is the condition to get paid and monetise the platform, it must be removed altogether as a mandatory one."*
- **Amends ADR-0029.** The waiver remains fully specified and does not become a free room by default. It stops being a **launch requirement**.
- **Amends nothing in ADR-0020 or ADR-0028's price structure.** $79, five included branches, $15 per additional branch, $199 ceiling, 30 calendar days: all unchanged.

---

## The decision

**Ponte launches paid from the first activation.** $79 USD for 30 calendar days, five active counterparty branches included, $15 per additional active branch, $199 maximum per room per period.

**The first-activation waiver is deferred.** It is specified, its entity resolution model is built, its migration is drafted, and **none of it is enabled at launch.**

**No surface may state, imply or hint at a free first Deal Room** until the waiver is enabled. `WO-7.5` places every waiver string behind the same flag as the waiver itself.

---

## Why

The waiver depends on resolving a verified legal entity. After correction 3, that resolves through an LEI or through a registry authority plus number. **The registry authority is not currently captured**, verified and recorded in the spec amendment of 3 August, so the waiver is LEI-only in practice.

**LEIs are held almost exclusively by entities that report in financial markets** under regimes such as MiFID II and EMIR. Ponte's members are exporters, distributors, freight forwarders and trading companies. Almost none hold one.

So the waiver, as buildable today, is **a benefit that virtually no member could claim**. Announcing it would put a promise on the pricing page that the system refuses, which is precisely the failure `DECISION-19` and the honesty doctrine exist to prevent.

The alternative, weakening the identity rule to self-declared organisation text, was considered and refused: an entitlement that cannot identify who consumed it is not an entitlement, it is an unmetered discount.

**Therefore the waiver is deferred rather than degraded.** The rule stays strict. The offer waits until it can be honoured.

---

## What this changes

| | Before | After |
|---|---|---|
| First activation | free, one branch, per verified entity | **$79**, five branches, as any activation |
| Waiver code and schema | on the launch critical path | **built, unapplied, disabled.** Retained. |
| Pricing copy | needed a waiver line everywhere | **already correct.** `messages/en.json` states the paid model accurately today. |
| Entity resolution | gated the launch | gates only the waiver, whenever that lands |

**Nothing already built is discarded.** `WO-7.2`, `WO-7.3` and `WO-7.4` are retained exactly as delivered: the pricing engine, the identifier normalisation and LEI validation, the resolved-entity model, and the drafted migration. They are the waiver, ready, waiting on verification capture. **Work paused is not work wasted, and none of it should be reverted.**

---

## What this does NOT unblock, and the distinction matters

**This decision does not make Ponte able to take money.** It removes one obstacle of two, and the remaining one is larger.

To charge for a Deal Room, `deal_room_entitlements` must admit `kind = 'paid'` and the room-period and billing tables must exist. **They do not.** `20260731e_deal_room_paid_room_periods.sql` is written, reviewed and **unapplied**.

Applying it requires, in order:

1. `DECISION-20` **step 3**, the reconstruction and migration proposal. Not started. `WO-6`.
2. `DECISION-20` **step 4**, a staging rehearsal with demonstrated rollback. **Cannot presently be performed reproducibly**, because production cannot be recreated from the version-controlled repository alone. That is the severe finding of the WO-2 report.
3. `DECISION-20` **step 5**, approval.
4. `DECISION-24`, review of the migration and the rehearsal evidence by **a second competent human database reviewer. That person has not been identified.**

**The critical path to revenue runs through a schema reconstruction and a person who has not been named.** The waiver was never the main obstacle. It was the second one.

---

## What remains possible without the waiver

The ability to give a room away is **not** lost, and it needs no entity resolution.

`deal_room_entitlements.kind` already admits `sponsored` and `waived`, and `ADR-0020` section 17 already requires a promotional waiver to display its value anchor:

```
Ponte Deal Room        $79 USD
Launch partner credit  minus $79 USD
Amount due               $0 USD
```

**An administrator granting a room to a named launch partner is a human decision with a human control, and needs no automated per-entity entitlement.** If a free room is wanted for early members, that is the mechanism, and it is available far sooner than the automated waiver.

**Not implemented by this ADR.** Recorded because it is the option that survives, and because it should be a choice rather than a rediscovery.

---

## Consequences

- `AUTH-01` in the canonical authority record is amended again: the first activation is **$79**, and the waiver is a specified future capability, not a v1 entitlement.
- `ADR-0029` keeps its model and its price table in full. Only its launch status changes.
- `WO-7.5` ships **paid-only copy**, with waiver strings written and flagged off.
- The verification-capture work, persisting `jurisdiction_code` and mapping to GLEIF Registration Authority codes, moves out of the launch path and into the backlog as the precondition for enabling the waiver.
- The count query keeps `usable_with_jurisdiction`. It is now a backlog measure rather than a launch gate.
- **`DECISION-24` becomes the single longest pole on the critical path.** It is a person, not a task.
