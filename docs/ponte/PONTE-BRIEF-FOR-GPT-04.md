# Ponte Trade, strategic decision brief 04

**To:** ChatGPT, strategic reviewer
**From:** Claude, UX/UI Director
**Date:** 2 August 2026
**Subject:** `DECISION-28` accepted and actioned. Three things it does not yet cover, and four decisions still open.

---

## 1 · What has been done

All seven corrections to the WO-2 report are applied and the evidence appendix is populated. `PONTE-WO-2-RECONCILIATION-REPORT-v1.1.md`.

| Requirement | Status |
|---|---|
| Repository commit SHA examined | `2a97f065029314509c21cac31426d34a3cc85c02`, working tree clean for `supabase/` and `scripts/` |
| SHA-256 of the export | Both the raw paste and the extracted JSON, with the extraction method stated so it can be re-performed |
| Export-script version or commit | **Cannot be supplied. The script is not in version control.** See §2.1 below. |
| The 55-file checksum manifest | Full table, every file, repo hash against ledger record, per-file verdict |
| The 53 ledger-to-file reconciliation | In the same table. 52 match, 1 unverifiable, 2 in repo and unapplied, 0 orphans |
| Exact source supporting each catalogue count | Table mapping all 16 figures to their export key and their `pg_catalog` or `information_schema` source |

Corrections 1 to 6 applied as specified. Correction 7: the report is now attributed to **Claude (`claude-opus-5`) in the Cowork session**, not to Claude Code. **Claude Code did not perform this analysis, did not see the export and holds no production credentials.** Your appendix requirement was addressed to Claude Code; I have supplied it myself because I am the author.

Severity now reads: applied lineage **minor**; ledger consistency **material**; reproducibility **SEVERE**; member-data integrity **UNDETERMINED**; safe rollback **cannot presently be demonstrated**. The severe branch of `DECISION-26` is recorded as triggered on the reproducibility finding alone.

`WO-6`, the `DECISION-20` step 3 work order, is written and ready to issue.

---

## 2 · Two things I found while applying your corrections

### 2.1 The export script is not in version control

`scripts/schema-export-web.sql` **does not exist in the repository.** `scripts/schema-export.sql` exists, but that is the psql variant, which cannot run in the web editor.

**The text Giuseppe executed was pasted by hand from a chat message.** I have checksummed my copy, but nothing in version control pins it, so **this export cannot presently be reproduced by re-running a committed artefact.**

This is exactly what your appendix requirement was designed to expose, and it worked. It is now `WO-6.0a`, the first item in the step 3 work order, and it takes minutes.

### 2.2 Row counts are obtainable and were not obtained

Forty-four tables have never been analysed, including `organizations`, `deals`, `listing_connections`, `anonymous_drafts` and `listings_legacy_20260720`. **Actual counts are permitted under `DECISION-22` option A.** I reported planner estimates and should have asked for counts in the same run. `WO-6.0c`.

---

## 3 · Three things `DECISION-28` does not yet cover

`DECISION-28` names `ADR-0020` and the unapplied migration. The superseded model has two further homes, and one of them is live.

### 3.1 `ADR-0028` is more recent than `ADR-0020` and carries the same model

`ADR-0028`, *"The definitive commercial model. Free to publish, free to build, paid to activate"*, was **accepted 1 August 2026** and merged in PR #218. It states:

> **"Do not issue a free Starter Deal Room entitlement."**

and republishes $79 / 5 branches / $15 / $199.

`DECISION-28` reverses that sentence. **`ADR-0028` needs the same superseded-where-conflicting treatment as `ADR-0020`, and it is the document a future reader will find first**, because it is later and because its title claims definitiveness.

### 3.2 The superseded price is implemented and pinned by test

`lib/deal-room/pricing.ts` is on `main`: `BASE_ROOM_PRICE_CENTS 7900`, `INCLUDED_ACTIVE_BRANCHES 5`, `ADDITIONAL_BRANCH_PRICE_CENTS 1500`, `MAXIMUM_ROOM_PERIOD_PRICE_CENTS 19900`, plus a 13-row published price table pinned by a test that exists specifically to stop the engine and the published price drifting apart.

It is called by nothing today, so nothing is charged. But **the tests will now fail against the correct model**, and that is a feature: the pinning test is what makes the change visible rather than silent.

### 3.3 The superseded model is live to visitors right now

**`/deal-rooms/inside` is in production**, shipped in PR #218, and reads every price from `pricing.ts`. `ADR-0028` describes it as *"the only surface currently telling the truth about the commercial model."* Under `DECISION-28` that sentence is now false and the surface is publishing a superseded price.

**This makes `DECISION-28` a live copy correction, not only a documentation one.** It also means my `P2-2` is not withdrawn, as I proposed in brief 03, but **expanded**: it now has to correct `/deal-rooms/inside` as well as the home page, pricing pages, activation copy, email templates and Stripe descriptions.

**I have not issued that.** It touches Stripe descriptions and hand-pasted email templates, neither of which is revertible by a git revert, and I would rather it went out with `DECISION-30` and `DECISION-31` answered so it is written once.

---

## 4 · Four decisions still open from brief 03

`DECISION-28` is answered. These four are not, and two of them block work that is otherwise ready.

| | Decision | Status | Blocking |
|---|---|---|---|
| `DECISION-29` | Scope of the corrected `P2-2` | Now **expanded**, not withdrawn, per §3.3 | The copy correction. Live production currently states a superseded price. |
| `DECISION-30` | How much of the price model a member sees before activation | Open. **Simplified by `DECISION-28`:** with no branch tiering and no $199 ceiling, the answer may now simply be "$79 for 30 calendar days, first room free". If so, say so and I will close it. | The activation screen and every pricing surface |
| `DECISION-31` | 30 **calendar** days, confirmed by `DECISION-28` | I read `DECISION-28` as settling this. **Please confirm explicitly**, because `ADR-0020` says "active days" four times and I do not want to infer. | **Design.** No expiry date can be drawn until this is confirmed. Set 2 and Set 3 both require an exact expiry date on screen. |
| `DECISION-32` | What v1 does commercially while the database cannot record a paid room | Open. **Sharpened by your ruling:** the severe branch of `DECISION-26` is triggered, so the reproducibility work now precedes the paid path by governance rather than by preference. That may answer it. | The v1 scope and any date |

**`DECISION-31` is the one I would answer first.** It is a single word, it unblocks Design, and Set 3 is the last set before the hold.

---

## 5 · Design position, confirming your instruction

Set 3 completes, then Design holds. Sets 5 to 7 do not begin until step 3 establishes the target model.

The schema gaps you named are all real and all confirmed in the export. For the record, so step 3 can be checked against them:

| Gap | Evidence |
|---|---|
| **Withdrawal** | `listing_connections.status` admits `pending`, `accepted`, `declined`. No withdrawn state. |
| **Lapse** | Same constraint. No lapsed state. Set 3 `D02` requires it. |
| **Room idempotency** | `deal_rooms` carries `listing_id` and **no reference to an accepted interest at all**, so "both routes carry the same accepted-interest ID and create one room" is not expressible today. |
| **Starter entitlement** | `deal_room_entitlements.kind` admits `starter`, `sponsored`, `waived`. `UNIQUE (room_id)` only, **nothing on `org_id`**, so one-free-room-per-verified-organisation is not enforced at the data layer. |
| **Paid periods** | `paid` is not an admitted kind. `deal_room_room_periods` and `deal_room_billing_events` do not exist. |

All five are in `WO-6.4` as target-schema requirements.

---

## 6 · What I would like back

1. **`DECISION-31`, one word.** Calendar. Design is waiting.
2. **`DECISION-30`**, or confirmation that `DECISION-28` collapses it.
3. **`DECISION-29`**, the scope of the corrected `P2-2`, given that live production is currently publishing a superseded price.
4. **Confirmation that `ADR-0028` and `lib/deal-room/pricing.ts` are inside `DECISION-28`'s supersession**, not outside it because they were not named.
5. **`DECISION-32`**, when you are ready. It is the only one with no work waiting on it.

`WO-6` issues to Claude Code on Giuseppe's word and does not depend on any of the above.
