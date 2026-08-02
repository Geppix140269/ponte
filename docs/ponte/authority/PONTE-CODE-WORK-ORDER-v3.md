# Ponte Trade — Claude Code work order v3

**From:** UX/UI Director
**Date:** 2 August 2026
**Authority:** `PONTE-CANONICAL-AUTHORITY-v4.md`, plus `DECISION-22` to `DECISION-27` taken today. Where anything conflicts with that authority, the authority wins.
**Supersedes:** work order v1 (held, never issued) and v2 (held). **This is v3.**

**What changed, and why.** Two review passes before issue caught five errors, and both passes were right. v1 was wrong on three points. It called production access "risk-free" in the same document that flagged it as a data-protection decision. It asserted that creating a read-only database role is not a production change. And it put the production inspection ahead of merging a fix for a primary CTA that is dead in production right now. All three are corrected below.

---

## 0 · Standing constraints

1. **No production schema change, data mutation, privilege change, migration execution or other state-changing SQL is authorised before steps 1 to 5 of `DECISION-20`.** `CREATE ROLE`, `GRANT` and any privilege change are state-changing and are not exempt because they are not data migrations. **The only production SQL permitted during step 1 is the approved, human-run, read-only export defined in `DECISION-22`.** Claude Code must never create or broaden its own role, and **any future AI connection to production requires a new explicit decision**, not a judgement made under this order.
2. **No direct production database connection** for the reconciliation work. See `WO-2`.
3. **No schema, RLS or storage-policy changes.** Not in a branch, not behind a flag, not prepared for later.
4. **Do not rewrite an accepted decision to look as though it always said something else.** Amend, supersede or annotate.
5. **Layering discipline on any rename:** customer-visible strings change unconditionally; metadata, enums, routes and webhook contracts are inventoried, given compatibility handling, and changed on new writes only; historical records are never rewritten.
6. **Report what you find, including what you could not determine.** A stated gap beats a confident guess.

---

## WO-1 · Merge PR #225, then #226 — **start now**

The primary CTA on `/deal-rooms/propose` is dead in production. One click changes the document title, the view does not re-render, a second click roughly ten seconds later is required. This takes operational priority over everything else in this order.

### Mandatory human preview check before #225 merges — `DECISION-27`

Automated tests and your evidence report are required but **do not replace this**. A dead click for ten seconds is exactly the failure a passing test misses.

Giuseppe, or an explicitly delegated human, must:

1. Open the Vercel Preview **from the actual PR head**.
2. Follow the affected landing-page path.
3. Click the repaired primary CTA.
4. Confirm an immediate, visible and correct response.
5. **Record the preview URL, the tested commit SHA, and pass or fail.**

Your job is to make that check easy: state the preview URL, the exact path to follow, and what a pass looks like, in the PR description.

### Your own verification, to state in the PR

- one click routes, with a visible state change inside 100 ms
- `/structure` renders the global header and a working back control, centres at desktop width, functions from 360 px, no frozen renderer
- intent selection on `/structure` produces an unmistakable selected state
- no customer-visible string, email, Stripe description or receipt uses "publish" for a Deal Room; the public-listing use of publish is untouched
- historical payment metadata unmodified and still processable

**PR #226 does not qualify as copy-only.** Your own report confirms it changes **expiry calculation and timezone rendering**. Under `DECISION-27` as tightened, that requires **functional verification and an appropriate preview check**, not copy evidence. Inspect the actual diff and state which behaviours changed.

**PR #227**, the export work, is open and **unapproved**. It must not be merged, and it is out of scope for this order until the `DECISION-22` boundary is formally satisfied.

---

## WO-5 · Console checklists for Giuseppe — **start now, in parallel**

Two surfaces are invisible to code and must be corrected by hand. **Do not attempt to reach them.**

**Checklist A · Supabase-hosted email templates.** Pasted in by hand, not in the repo, so every P1 and P2 correction has missed them. List each template, and for each the exact strings to look for and their approved replacements. At minimum: any promise that a person reviews every submission; "publish" used for the paid Deal Room action; "30 active days"; any storage or retention claim; any expiry stated without date, time and timezone.

**Checklist B · Stripe dashboard.** Every product and price a human should open, and what to check on each: Deal Room descriptions using "publish", the credits product to be archived rather than deleted, any description implying a subscription or credit balance.

**Two constraints on both:**

- **Never request a secret, token or connection string.** Not in the checklist, not as a prerequisite.
- **Dashboard labels must be re-checked at execution time.** Supabase and Stripe change their interfaces, so write the checklist to describe what is being looked for, not only where a menu item sat on a given day.

State plainly which corrections cannot be verified from code, so nothing is assumed done.

---

## WO-2 · Reconciliation report — **blocked until the export boundary is implemented**

Steps 1 and 2 of `DECISION-20`. **This no longer involves connecting to production.**

### The access boundary — `DECISION-22`

You analyse a **sanitised export produced by an authorised human**. You do not connect to the production database. You do not hold credentials.

**The export may contain, and nothing else:**

- schema and system-catalog metadata
- migration identifiers, checksums and application timestamps
- RLS and storage policy definitions
- indexes, constraints and relationships
- functions and views **only where their definitions contain no embedded secrets and no member data**
- **catalog-estimated table counts. Not row contents, and not exact counts.**

**The export must not contain:**

- application, `auth` or storage-object rows
- sampled member or commercial records
- logs, backups, uploaded files, or object names
- secrets, tokens or connection strings
- any query, function or view that returns member data

**On exact counts.** Direct table `SELECT` access sufficient to run `COUNT(*)` normally also permits row access. **You receive no such grant.** So: catalog estimates only. Any essential exact aggregate is produced and reviewed by the authorised human or DBA.

**If the export is insufficient, stop and identify the missing evidence.** Do not work around it. A report with a stated hole is the correct outcome; a boundary crossed quietly is not.

**There is no database-role exception.** If the export proves insufficient, stop and request **additional human-run, sanitised queries**. Any future AI connection to production requires a **new explicit decision**, taken separately, not an operational judgement under this order.

### Your first deliverable is the export script, not the report

Write the **read-only catalog query set** that produces a conforming export, for a human to run. Annotate each query with what it returns and why it is inside the boundary. This is how the boundary is implemented, and it is the thing that unblocks the rest of `WO-2`.

### Then, the reconciliation report

| Area | What to establish |
|---|---|
| Actual schema | Tables, columns, types, nullability, defaults, constraints, foreign keys, indexes, enums |
| Migration history | What the migrations table records as applied, in what order, with what checksums, and when |
| Repository migrations | What migration files exist and their intended order |
| Drift | In production not in repo · in repo not in production · present in both with differing definitions |
| Order and integrity | Applied out of order, twice, recorded but not applied, applied but not recorded, or edited after application |
| RLS | Policies actually in force, against what the repo expects. RLS is the mandatory permission boundary for the Deal Room, so an inaccurate picture here is dangerous. |
| Storage | Buckets and policies; any bucket public that should not be |
| Blockers | Anything that would cause a forward migration to fail, corrupt data, or require downtime |
| Unknowns | What could not be determined within the boundary, and what evidence would settle it |

### What the report must not contain — `DECISION-26`

**No migration SQL. No preferred remedy. No implementation recommendation.**

It **may and should** classify **severity, uncertainty and missing evidence**. Use this definition, which is binding:

> Drift is **severe** where migration lineage cannot be proven, member-data integrity is uncertain, histories conflict materially, or safe rollback cannot be demonstrated.

The response to each severity band is already decided in `DECISION-26` and is not yours to propose. State the finding. The controller and Giuseppe decide the response.

---

## WO-3 · PR #53 — audit and supersede — `DECISION-23`

**Correction issued before this order was acted on. PR #53 is merged**, on 27 July 2026 at commit `b9f2c032ac44f2fd02b0d2124a0ebc2af9c993b4`, and current `main` descends from it. An earlier instruction from me described it as unmerged and proposed closing it. That was wrong: I repeated a status note written inside one of the documents as though it were verified repository state, without checking GitHub.

**Its documents are therefore already in `main`, and several of their positions are superseded.** Nothing is being merged or closed.

1. **Inventory** the files introduced or changed by PR #53.
2. **Classify** their content as still valid, superseded, or contradictory, against canonical authority v5.2. Cite the decision ID for every superseded item.
3. **Generate replacement documentation** from the current canonical authority and the approved July material.
4. **Update the authority manifest** so the repository states which document is authoritative for what.
5. **Explicitly mark or archive superseded documents.** A superseded document that still reads as current is the exact failure this exercise exists to prevent.

**Do not revert the merge. Do not rewrite repository history.**

Expect the superseded pile to include the entitlement model, the paid-period definition, the verification placement and most of the vocabulary. Reference: `AUTH-01` to `AUTH-05`, `DECISION-01` to `DECISION-27`.

**Also place canonical authority v5.2 in the repository authority record, and update the control handover at GitHub Issue #130.** Neither has been done.
---

## WO-4 · P2 — after #226 merges

Specified in full in `PONTE-P2-DECISION-COPY.md`. Summary only:

- **P2-1** withdraw credits as a six-step sequence, not a delete. First and alone; it is the only item that can break a payment path.
- **P2-2** pricing copy becomes Starter or $79
- **P2-3** retention stated, with two behavioural requirements: opening a draft must not reset the clock, and the anonymous upload path must be closed
- **P2-4** never claim comprehensive screening, **including in prompts** — `lib/ai-vet.ts` regenerated a claim the templates did not contain, and that class of problem will recur
- **P2-5** investigation copy must not promise an outcome

---

## Order

1. **`WO-1` and `WO-5`, now, in parallel.**
2. **`WO-2`**, in parallel, **only once the `DECISION-22` export boundary is implemented.** Your export script is the thing that implements it, so that script is the first `WO-2` deliverable.
3. **`WO-3`**: salvage classification, replacement generation, merge replacement, close #53.
4. **`WO-4`** after #226 merges.

---

## Governance in force

- **Repository and deployment controller:** ChatGPT. Evidence review, repository-state verification, go/no-go. Holds no credentials, executes nothing, and does not replace legal accountability.
- **Implementation executor:** you.
- **Accountable production owner and final human approver:** Giuseppe.
- **For a material or severe database migration**, a **second competent human database reviewer** must review the migration and rehearsal evidence before production execution. Giuseppe cannot be both the sole human authoriser and the sole human technical reviewer of a high-impact rebuild.
- **No firm launch date may be communicated, internally or externally, before the reconciliation report exists.** Progress, gates and dependencies may be communicated. A promised date may not.

---

## What to report

Per item: what was done, what was found, what could not be done and why, and anything you believe is wrong in this order.

Two of the most valuable findings today came from you contradicting a brief: the Stripe enum correction, and spotting that `lib/ai-vet.ts` was regenerating a claim the templates did not contain. This order was itself corrected on three points before issue. Keep doing that.
