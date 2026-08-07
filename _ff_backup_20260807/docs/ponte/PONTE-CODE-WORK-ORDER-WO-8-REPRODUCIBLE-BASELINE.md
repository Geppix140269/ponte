# Ponte Trade, Claude Code work order WO-8

## The reproducible baseline. Execute the plan that already exists.

**From:** UX/UI Director
**Date:** 6 August 2026
**Authority:** `ADR-0030`, `ADR-0031`, `DECISION-20`, `DECISION-26` severe branch
**Supersedes:** `WO-6.1` and `WO-6.2` of `PONTE-CODE-WORK-ORDER-WO-6-STEP-3.md`, which asked for a reconstruction proposal. **One already exists and is correct.**
**Dating note:** this work order was drafted 2 August and finished 6 August. Where it says "today" it now says a date. The production schema export it rests on is **2 August** and is four days old.
**Status:** ready to hand over. **Section 1 was rewritten on 6 August after the owner checked the Supabase dashboard. Read it before section 0.**

---

## 0 · Read this before anything else

**`docs/plans/active/migration-chain-reconciliation.md` already contains the plan WO-6 asked for.** Written 26 July 2026. Status: *"proposed, not started."* It is accurate, it is well reasoned, and its central discovery is the one that matters:

> *"Production is therefore protected by the breakage, not by design: repairing the chain without first disarming the pipeline would let every file in the folder run against production on the next merge."*

**That sentence was written on 26 July and is now believed to be wrong about the present, though right about the principle. See section 1.**

**Do not re-derive the plan. Execute it, with the five updates in section 3.**

---

## 1 · The hazard, corrected by evidence gathered 6 August

An earlier draft of this work order said a Supabase GitHub integration applies `supabase/migrations/` to production on every push to `main`, and that disarming it was a blocking prerequisite. **That is very probably not the current state, and the repository already knew.**

**What `supabase/pending/README.md` says, 22 July:** the integration is installed and applies to production `cptglsmjmzcfpjndqfmc` on merge. **Inferred from a check run's `details_url`**, not from the dashboard.

**What `docs/codex/DATABASE-STATE.md` says, 28 and 30 July, and it contradicts the above:**

- the `Supabase Preview` check links to project `kltuzbxnldtmdfhakphv`, later `pyplitspfeeqwzdimltf`
- **neither is production, and neither is reachable by the owner's access token at all**
- the check is `SKIPPED` on a PR with no migration and `FAILURE` on a PR that adds one
- PR #107 added `20260730a`, the check failed, **it was merged anyway, and `20260730a` was never applied**

**What the Supabase dashboard showed on 6 August:** on the Ponte Trade project, the GitHub integration presents **"Connect GitHub"** with **no repository named**.

**Conclusion, stated with its uncertainty.** The GitHub App appears to be installed on the *repository* and bound to Supabase projects that are **not Ponte's and not in this account**. It is producing checks that look like a migration gate and are not one. **The auto-apply-to-production path is very likely not live**, and PR #107 is the empirical proof: a migration merged and did not apply.

**This is not reassuring, it is differently alarming.** Something outside this account receives the repository on every pull request and reports a check that a reasonable person would read as a database gate.

---

## 2 · Step 0, revised. Confirm, then do not re-arm

The prerequisite is no longer "disarm". It is **"confirm it is not armed, and do not arm it."**

**`WO-8.0a`, Giuseppe, five minutes.** On GitHub, `Geppix140269/ponte`, Settings, then Integrations or GitHub Apps: is the **Supabase** app installed, and what repository access does it hold? That is the definitive check. The Supabase dashboard shows only this project's side of the link.

**`WO-8.0b`, standing instruction, binding on everyone including Claude Code.** **Do not connect GitHub to the Ponte Trade Supabase project**, and do not repair or re-point the existing installation, until `WO-8` is complete and the unapplied migrations are out of `supabase/migrations/`.

The moment that connection is made, the folder becomes an auto-deploy directory. As of 6 August, on `main`, it contains:

- `20260731e_deal_room_paid_room_periods.sql`, the **billing schema**, deliberately unapplied
- `20260730a_market_signal_search.sql`, which **will fail** on `extensions.gin_trgm_ops`, demonstrated on the dev database on 3 August

and the **waiver entity and claim migration** of `8d4c758`, 3 August, will join them when its branch merges. **It is not in `main`'s `supabase/migrations/` as of 6 August**, which still holds the same 55 files it held on 31 July, and it is not in `supabase/pending/` either. Confirm which branch carries it and where it sits.

**The hazard is real but it is in the future rather than the present.** It arms itself the day somebody connects the integration, and that day will look like a routine setup task.

**`WO-8.0c`, for the report.** The stale installation should be removed or corrected. That is an owner decision, it is not in scope here, and it should not be quietly bundled into the chain repair. **A check that fails only on migration pull requests is worse than one that always fails**, because it reads as a gate and is not one.

---

## 3 · Five updates to the 26 July plan

The plan predates the WO-2 reconciliation, PR #203 and #204, and issue #84. Each of these changes it.

### 3.1 Two files must not be swept into a working chain

The plan was written when everything in `migrations/` was applied. **WO-2 established that two files are not**, and a third has since been added.

| File | State | Requirement |
|---|---|---|
| `20260730a_market_signal_search.sql` | written, never applied | Must **not** run on a repaired chain against production |
| `20260731e_deal_room_paid_room_periods.sql` | written, never applied, **billing** | Must **not** run. `DECISION-20` sequence applies. |
| The waiver entity and claim migration, `8d4c758`, 3 August | written, never applied, **not present in `main`** | Must **not** run. `ADR-0030` defers the waiver entirely. **Locate it first.** |

Propose how unapplied-by-design files are held so that a replay cannot pick them up, and so that the distinction is visible in the folder rather than kept in someone's head. `supabase/pending/` is the existing precedent and it already holds `20260722a_drop_legacy_shop.sql`. Say whether it is the right home for these three or whether something clearer is needed.

### 3.2 `20260730a` is already known broken

It creates `pg_trgm` in `extensions` while production has it in `public`, so `extensions.gin_trgm_ops` does not resolve. Predicted by WO-2 from the catalogue, then **executed and confirmed on the dev database** on 3 August. **Do not fix it in this work order.** It stays unapplied and it stays out of the chain.

### 3.3 The verification route is better than the plan assumed

The plan proposed proving the chain via the `Supabase Preview` check. Since then, PR #203 and #204 built a replay proof, `supabase/schema-snapshots/` holds a schema-only production dump, and `deal-room-migration-replay.yml` restores the newest snapshot as a baseline and refuses any file containing `COPY`, `INSERT` or a data section. Issue #84 does the same locally through `npm run dev:db`.

**Use that.** It is stronger evidence than a green check, it runs without production access, and it already exists.

The plan's own warning still stands and should be kept: **if a check goes green for a reason other than the chain applying, that is not evidence and must be recorded as such.**

### 3.4 Name what the baseline is, and whether the snapshot is it

The plan proposes `00_base_schema.sql` carrying `supabase/schema.sql`. That closes `profiles` and `is_admin()`, but `supabase/schema.sql` creates `profiles` with **7 columns** while production has **31**, and its own header says so.

So there are two candidate baselines and the choice needs stating rather than assuming:

| Option | What it means |
|---|---|
| **A · A hand-written `00_base_schema.sql`** | The chain builds a database from the repository. It does **not** reproduce production, and the drift stays. |
| **B · Adopt the committed schema-only snapshot as the genesis** | The chain builds something equal to production. History before the snapshot becomes archive rather than replay. This is what CI already does. |

**Say which, and why.** `DECISION-26`'s severe branch is triggered, so a clean rebuild is an acceptable outcome and does not need re-arguing. What it needs is a named choice with its consequences written down.

### 3.4b Row counts, measured 6 August, which simplify section 3 materially

`docs/ponte/PONTE-PRODUCTION-COUNTS-2026-08-06.md` records counts run by the owner in the SQL editor. Two of them change the legacy-object work:

- **`deals` holds 0 rows.** The second, older deal model has never been used.
- **`listings_legacy_20260720` holds 0 rows.**
- **`deal_rooms` holds 0 rows**, so the entire Deal Room schema carries no member data.
- **`deal_room_entitlements` holds 0 rows.**

So removing the legacy listings table and its two foreign keys is a **data-free structural change**. Nothing needs preserving because nothing is there. Plan it that way and say so, rather than carrying a data-preservation section that has no data in it.

**Still unmeasured:** `adamftd_verification_checks`, which is one of the two foreign keys concerned. Count it in the same style before planning its treatment.

### 3.5 The two ledgers still disagree

`public.schema_migrations` has 53 rows and reconciles to the repository within one file. `supabase_migrations.schema_migrations` has **one**. Whatever baseline is chosen, state what happens to both, and whether the Supabase CLI becomes usable afterwards or whether this project continues applying by hand.

---

## 4 · Unchanged from the 26 July plan, and still right

Archive the seven dead-shop files rather than delete them: they are the record of what production actually received. Make `02_ponte_previews_bucket.sql` re-runnable, drop-then-create like every dated migration since. `20260722a_drop_legacy_shop.sql` stays deferred and stays out of `migrations/`. No production schema, data or RLS change is proposed by this work. Rollback is reverting the pull request, and no database is touched in either direction.

---

## 5 · What this unblocks, and what it does not

**Unblocks:** `DECISION-20` step 4. Once the repository can build a database, a rehearsal with a demonstrated rollback becomes possible for the first time. That is the severe finding of the WO-2 report and this is the work that closes it.

**Does not unblock, and must not be attempted here:** applying `20260731e`. That still needs step 3's proposal, step 4's rehearsal, step 5's approval, and the four controls in `ADR-0031`. **No production migration executes under this work order.**

**`ADR-0031` removed the second-human requirement.** Nothing on this critical path now waits for a person who does not exist. The four assurance controls replace it and they are not optional.

---

## 6 · Order

1. **`WO-8.0a` and `WO-8.0b`.** Giuseppe confirms the GitHub App's repository access. Nobody connects GitHub to the Supabase project. **Confirmation required, but this no longer blocks the work below**, because the evidence says the path is not live.
2. Archive the seven, hold the three unapplied files, make `02` re-runnable.
3. Choose and build the baseline, per 3.4, with the choice recorded.
4. Prove it with the replay route in 3.3, on a throwaway database.
5. Report. **Merge remains an owner action.**

Also carry forward, any time, no dependencies: **`WO-6.0a`**, commit `scripts/schema-export-web.sql`, without which no future export is comparable to the 2 August one. And **`WO-6.7`**, whether any of the 32 `SECURITY DEFINER` functions bypasses the `AUTH-05` boundary. Both are repository-only.

---

## 7 · Report

What was done, what was found, what could not be done and why, and anything here you believe is wrong.

**In particular, section 1.** It was rewritten on 6 August after the owner checked the Supabase dashboard and found no repository connected to the Ponte Trade project. The earlier claim, that production was one merge from an uncontrolled schema write, came from `supabase/pending/README.md` and the 26 July plan, both of which inferred it from a check run rather than from the dashboard. `DATABASE-STATE.md` of 28 and 30 July contradicts them, and PR #107 is the empirical control: a migration merged, the check failed, and the SQL never applied.

**If you find evidence that the auto-apply path is live after all, say so immediately and stop.** The ordering in section 6 depends on it not being live, and I have been wrong about repository state before by trusting a document rather than checking.
