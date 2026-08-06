# ADR-0031: Migration assurance replaces the second human reviewer

- **Status:** ACCEPTED
- **Date:** 2026-08-06
- **Owner decision**, 6 August 2026. `DECISION-24`'s requirement for a second competent **human** database reviewer is **withdrawn**.
- **Replaces** `DECISION-24`. Does not touch `DECISION-20`.

---

## The decision

**A second human database reviewer is no longer required before a production migration.**

In its place, four controls, all of which the owner can execute alone and none of which requires hiring anybody.

---

## Why the swap rather than a straight deletion

`DECISION-24` existed because the person approving a production migration was also the person who commissioned it, and there was no independent check. That is a real weakness and it is worth keeping something in its place.

**But a second pair of eyes was always the weaker half of the protection.** The stronger half is already in `DECISION-20` step 4: a rehearsal that proves the migration works on a copy, and a rollback that is demonstrated rather than asserted. **A migration you can undo is safer than a migration two people read.**

So the human requirement goes, and the controls that actually protect member data are made explicit and mandatory.

---

## The four controls

### 1 · Independent machine review, from a different model family

The migration, the current schema and the rollback are reviewed by an AI **not in the Claude family**, so a shared blind spot cannot pass unnoticed. The reviewer is asked specifically for:

- any path that loses, truncates or silently rewrites member data
- any operation that is not reversible by the stated rollback
- any constraint or index that would fail against real production data rather than an empty table
- anything that takes a long lock on a table with rows

**Its output is recorded verbatim in the pull request, including where it disagrees.** Not summarised, and not filtered by the agent that wrote the migration.

**What this control is good for:** mechanical correctness, missed reversibility, data-loss paths, constraint logic. Those are the failures that actually happen and a second model catches them well.

**What it is not:** accountable. An AI reviewer cannot bear responsibility, and under UK GDPR the data controller is the company. That is why controls 2 to 4 exist and why they are not optional.

### 2 · A verified restorable backup, taken immediately before execution

`scripts/backup.mjs` and `scripts/restore.mjs` already exist in the repository.

**A backup that has not been restored is not a backup.** The backup taken before a migration must be **restored to a scratch database and confirmed to load**, before the migration runs. Confirmation recorded with a timestamp.

### 3 · The rehearsal, unchanged, from `DECISION-20` step 4

The migration is rehearsed against a database restored from that backup, with **pass criteria written before the run, not after**. The rollback is executed in the rehearsal and shown to return the schema to its prior state.

**This control is currently unsatisfiable**, because production cannot be recreated from the version-controlled repository alone. That is the severe finding of the WO-2 report and it is what `WO-6` exists to fix. **Withdrawing the human reviewer does not change this.**

### 4 · A recorded owner decision naming what is being accepted

The owner's approval states, in his own words, what risk he is accepting and on what evidence. Recorded in the pull request.

This is the control that replaces independence: **not a second opinion, but an explicit, dated, attributable acceptance.**

---

## Execution conditions

- No migration executes outside a stated window with the owner present.
- No migration executes on a Friday or before a period when nobody is watching.
- The four controls above are recorded **before** execution, not reconstructed after.

---

## What this changes on the critical path

**`DECISION-24` is removed as a blocker.** No person needs to be found.

**Nothing else moves.** The path to charging for a Deal Room still runs:

1. `WO-6`, the reconstruction and migration proposal. Not started.
2. A reproducible baseline, so that a rehearsal is possible at all. **This is the binding constraint.**
3. Rehearsal, rollback proven.
4. Owner approval under the controls above.
5. `20260731e` applied, `deal_room_entitlements` admits `paid`, the room-period and billing tables exist.
6. The charging path and the activation surface built.

**The longest pole is no longer a person. It is the reproducible baseline.** That is a piece of work with a known shape, owned by Claude Code, and it can start immediately.

---

## What was gained and what was given up

**Gained:** weeks of calendar time, and the removal of a dependency on somebody who did not exist.

**Given up:** genuine human independence on the one class of change that can destroy member data irreversibly.

Recorded plainly so that the trade is visible later, by whoever reads this after something has gone wrong. **The controls above are the price of the trade and they are not optional.** If any of the four is skipped, this ADR has been used to remove a control rather than to replace one.
