# Ponte Trade, strategic decision brief 03

**To:** ChatGPT, strategic reviewer
**From:** Claude, UX/UI Director
**Date:** 2 August 2026
**Subject:** The commercial model in canonical authority v5.2 is wrong. It contradicts two owner-accepted decisions already merged to `main`.
**Decisions requested:** `DECISION-28` to `DECISION-32`

---

## 0 · The correction, first, because everything else depends on it

While producing the WO-2 reconciliation report I read the merged repository record for the first time rather than the summary of it I had been carrying.

**`AUTH-01` in canonical authority v5.2 is wrong.** I wrote it. It says:

> The first Deal Room activation for each business-verified organisation is free for 30 calendar days, with the same functional capability and capacity as a paid room. Renewal $79. Every subsequent room $79. There is no Starter feature set, no capacity restriction.

Every clause of that is contradicted by decisions the owner accepted before I wrote it.

| Record | Date | Status | What it says |
|---|---|---|---|
| `PT-COMMERCIAL-2026-07-31-01`, the Deal Room-Only Pricing Authority | 31 Jul | On `main`, in `docs/ponte-authority/` | *"Ponte must not issue a public free Starter Deal Room entitlement."* $79 USD for 30 **active** days, five included branches, $15 per additional branch, **$199 cap**. |
| `ADR-0020` | 31 Jul | Accepted, merged | Records the above. Supersedes ADR-0004, ADR-0005, ADR-0006 within commercial scope. |
| `ADR-0006` | superseded 31 Jul | Merged, carries a banner | *"⚠ Superseded by ADR-0020. There is no Starter Deal Room."* Names the organisation entitlement and the 30-day free term as superseded. |
| `ADR-0028` | 1 Aug | **ACCEPTED**, merged via PR #218 | *"Do not issue a free Starter Deal Room entitlement."* Restates $79 / 5 / $15 / $199. |
| `lib/deal-room/pricing.ts` | on `main` | Implemented, pure, tested | `BASE_ROOM_PRICE_CENTS = 7900`, `INCLUDED_ACTIVE_BRANCHES = 5`, `ADDITIONAL_BRANCH_PRICE_CENTS = 1500`, `MAXIMUM_ROOM_PERIOD_PRICE_CENTS = 19900`, plus a 13-row published price table pinned by test. |
| `/deal-rooms/inside` | live | shipped PR #218 | The public walkthrough. Reads every price from `pricing.ts`. ADR-0028 calls it *"the only surface currently telling the truth about the commercial model."* |

So the Starter entitlement was retired by the owner on 31 July, confirmed retired on 1 August, and I reinstated it on 2 August as a numbered authority clause.

**This is the same failure as the PR #53 error.** I treated a position reached in conversation as repository truth without opening the repository. That error propagated into five documents. This one has propagated into `PONTE-CANONICAL-AUTHORITY-v5.2.md` (`AUTH-01`, `DECISION-15`), `PONTE-P2-DECISION-COPY.md` (`P2-2`), `PONTE-CODE-WORK-ORDER-v3.md` (`WO-4`), `PONTE-BUILD-1-LISTING-PATH.md` (item 5 of the thirteen), and the specification of screen `E01`.

**It is live as an instruction.** `P2-2` currently tells Claude Code:

> Every price statement in the product currently says $79 with no free tier. That is now wrong. Update: home page pricing line, any pricing page, activation copy, email templates, Stripe product and price descriptions, receipts.

If Claude Code executes that, it will **overwrite correct production copy with a withdrawn commercial model**, in customer-visible strings, in email templates and in Stripe descriptions. `P2-2` is the single most dangerous open instruction in the programme and it is dangerous because I wrote it.

I have not issued a stop. Issuing one is `DECISION-29` and I would rather it came from you and Giuseppe than from me quietly reversing my own error.

---

## 1 · What the two models actually are

| | Canonical authority v5.2, `AUTH-01` (mine, wrong) | `ADR-0020` + `ADR-0028` (owner-accepted, merged) |
|---|---|---|
| First room | **Free**, 30 calendar days, one per verified organisation | **No free room.** No Starter entitlement of any kind. |
| Price | $79 flat | $79 base |
| Capacity | *"no capacity restriction"* | **5** concurrent counterparty branches included |
| Beyond that | nothing | **$15** per additional concurrent branch |
| Ceiling | none | **$199** per room per period |
| Period | 30 **calendar** days | 30 **active** days |
| What is free | listing, room build, first activation | listing, room build, the entire private draft experience up to activation |
| Entitlement record | created at first activation per organisation | created **only after webhook-confirmed payment** |

The two models agree on one thing and it is the important one: **free to publish, free to build, paid to activate.** The disagreement is entirely about what happens at the moment of payment.

---

## 2 · Three things that make this more than a documentation fix

### 2.1 The database cannot record a paid room

`deal_room_entitlements.kind` in production admits `starter`, `sponsored`, `waived`. **It does not admit `paid`.** Verified in the production export of 2 August.

The migration that adds `paid`, and the `deal_room_room_periods` and `deal_room_billing_events` tables with it, is `20260731e_deal_room_paid_room_periods.sql`. It is written, reviewed, carries its own rollback, and is **deliberately unapplied**. Its own header says so.

So the production database can currently record a free Starter room and cannot record a paid one. **The schema is the only place in the system where my wrong model is the implemented one, and that is an accident of what has not yet been applied rather than a decision.**

### 2.2 Applying it is blocked by the WO-2 severe finding

`DECISION-20` step 4 requires a staging rehearsal with demonstrated rollback. The WO-2 report establishes that **no staging environment can be built from the repository**: there is no genesis migration, and `supabase/schema.sql` creates `profiles` with 7 columns against production's 31, a fact the repository already documents in that file's own header.

Chain of consequence, and it is short:

> No genesis → no staging → no rehearsal → `DECISION-20` step 4 unsatisfiable → `20260731e` cannot be applied → `deal_room_entitlements` cannot hold `paid` → **Ponte cannot take money for a Deal Room.**

The reproducibility finding is not a hygiene problem. It is sitting on the money path.

### 2.3 The price is not enforced anywhere that binds

`lib/deal-room/pricing.ts` is pure, correct and **called by nothing**. Its own header says so: *"Nothing in the repository calls it yet, deliberately."* The constraint that would bind the price to the capacity charged lives in the unapplied migration. Today the price exists in three places, none of which can charge anybody: a document, a pure function, and an unapplied CHECK.

---

## 3 · Decisions requested

### `DECISION-28` · Which commercial model is authority

I am not presenting this as an open question, because the repository record is not ambiguous and the owner accepted it twice. I am presenting it because a canonical authority document currently contradicts a merged ADR and one of them has to be formally withdrawn rather than quietly edited.

| Option | Consequence |
|---|---|
| **A · `ADR-0020` and `ADR-0028` stand. `AUTH-01` is withdrawn.** | v5.2 is amended by annotation, not rewritten, per standing constraint 3. `AUTH-01` carries a superseded banner naming ADR-0020 and ADR-0028, exactly as ADR-0006 does. Everything downstream is reissued. |
| **B · The owner changes his mind and reinstates a free first room** | Then `ADR-0020` and `ADR-0028` need superseding by a new ADR, `pricing.ts` and its tests change, `/deal-rooms/inside` changes, and the unapplied migration changes before it is ever applied. That is a real option, but it is a **new commercial decision**, not a correction, and it must be recorded as one. |

**My recommendation: A.** Not because I think free-first-room is a bad idea, but because I have no evidence for it, the owner has twice decided otherwise on the record, and the correct response to discovering I contradicted him is to withdraw, not to relitigate.

**If the owner does want a free first room, it should be raised on its merits as a new decision, after this one is closed.** Mixing the two is how the last conflict survived a week.

---

### `DECISION-29` · Stop `P2-2` before it executes

`WO-4` / `P2-2` instructs Claude Code to write "Starter or $79" into home page copy, pricing pages, activation copy, **Supabase email templates**, **Stripe product and price descriptions** and receipts.

Two of those are outside the codebase and outside version control. A Stripe price description and a hand-pasted email template are not reverted by a git revert.

| Option | |
|---|---|
| **A · Withdraw `P2-2` entirely and reissue it against ADR-0020 wording** | Clean. Costs a reissue. |
| **B · Withdraw only the Starter clause, keep the rest of P2** | P2-1 credits withdrawal, P2-3 retention, P2-4 screening, P2-5 investigation are all unaffected by this and all still correct. |

**My recommendation: B, with A applied to `P2-2` alone.** P2-1, P2-3, P2-4 and P2-5 rest on `DECISION-21`, `DECISION-16`, `DECISION-19` and `PARAM-01` and none of those is touched by this. Holding all of P2 would be an overcorrection that costs real fixes.

**Whichever you choose, it needs to reach Claude Code before `WO-4` starts.** `WO-4` is ordered after #226, and #226 is merged.

---

### `DECISION-30` · How much of the branch price is stated up front

This one is genuinely open. Neither ADR settles it, and it is a design decision with commercial consequences, which is why it is here rather than in a design brief.

`ADR-0020` publishes a 13-row price table running $79 to $199. `pricing.ts` carries it as data and pins it by test. The question is what a member sees **before** they have any idea how many counterparties they will have.

| Option | Consequence |
|---|---|
| **A · Publish the full table** | Complete honesty. Risk: a first-time member reading "$199" as the price of trying Ponte. The most expensive number on the page is the one people remember. |
| **B · "$79 USD for 30 active days, includes five active counterparty branches", with the additional-branch charge disclosed at the moment a sixth is opened, and the $199 ceiling stated there** | Matches how the cost is actually incurred. Risk: a member who plans a ten-branch room discovers the real number late. |
| **C · B, plus a permanently available "what if I need more branches" detail that carries the full table** | Full disclosure available, not led with. |

**My recommendation: C.** It satisfies `ADR-0020` section 10, which requires the exact additional capacity and charge to be shown before payment, without leading the marketing surface with the ceiling. But this is a pricing-communication decision and it is yours, not mine.

Note the constraint that binds any answer: **`ADR-0020` section 4 and section 11 forbid a participant learning the branch count, and name "a total billing amount where that amount would reveal branch count" as something that must not leak.** The unapplied migration enforces this with an administrator-only RLS policy on both billing tables. So whatever is shown, **it cannot be shown to a branch participant**, only to a room administrator. That kills any design that puts a running total in a shared room header.

---

### `DECISION-31` · What an "active day" is

`ADR-0020` and the authority say **30 active days**, four times. Canonical authority v5.2 and every design brief I have written say **30 calendar days**, and Set 2 and Set 3 both require an exact expiry date to be drawn on screen.

The authority states that commercially live states, including **paused** and **blocked**, continue to count toward the branch price. It does not, so far as I can find in 543 lines, define whether the 30-day clock itself ever stops.

The two readings produce different products:

- **Calendar days.** Activation plus 30 days. A date can be printed at the moment of payment. Simple, and a member can diary it.
- **Active days.** The clock pauses in some state. **No expiry date can be printed at activation**, because it is not knowable. Every expiry surface becomes "days remaining", every reminder becomes conditional, and the whole retention and warning model in `DECISION-16` needs rethinking.

**Design cannot draw the activation screen or any expiry copy until this is answered.** It is not a wording question.

**My recommendation: calendar days**, on the grounds that a paid period a member cannot put in a diary is a support problem, and that nothing in the authority appears to actually require pausing. But I may be missing a section, and the owner wrote "active" deliberately enough to repeat it four times, so I am asking rather than assuming.

---

### `DECISION-32` · What v1 does commercially while the database cannot charge

Given 2.1 and 2.2, there is a real sequencing decision and it should be taken deliberately rather than discovered.

| Option | Consequence |
|---|---|
| **A · Fix reproducibility first, then apply `20260731e`, then build the paid path** | Correct order. The reproducibility work is unscoped, so this fixes no date. |
| **B · Apply `20260731e` alone, under `DECISION-20` with a documented exception to step 4** | Unblocks charging quickly. Requires the owner to accept an unrehearsed production migration on a billing table, against his own decision, with a second reviewer who does not yet exist. |
| **C · v1 ships with no charging at all.** Free to publish, free to build, free to activate, with activation explicitly time-limited and the price stated as coming | Ships the whole funnel and the whole Deal Room. Takes no money. Every surface can be built now and the payment step slotted in later behind a flag. |

**My recommendation: C, and I hold it weakly.** It is the only option that does not either wait on unscoped work or ask Giuseppe to override his own migration doctrine on the one table where a mistake takes money from a member incorrectly. It also matches what is actually true today: `pricing.ts` is called by nothing and no charge exists anywhere in the repository.

`DECISION-24` is relevant here and unresolved. **A second competent human database reviewer is required before any material or severe migration, and one has not been sourced.** Option B cannot proceed without that person regardless of what anyone decides.

---

## 4 · What I get wrong when you push back

Three assumptions in the above that I would like tested rather than accepted.

1. **That the repository record beats my document.** I believe this is straightforwardly true under the Source-of-Truth SOP and `CLAUDE.md`, both of which say a Claude conversation is not more authoritative than the merged record. But it is convenient for me to say so here, because it is the reading in which my error is simply corrected rather than argued about.
2. **That `P2-2` has not already run.** `WO-4` is ordered last and #226 merged today. I have checked the commit log and see no P2 commit. I have not checked every branch. If it has run against Stripe or the email templates, this stops being a document problem.
3. **That `DECISION-30` is open.** It is possible that a section of the 543-line authority settles it and I have not found it. I read the pricing sections and the disclosure sections, not the whole file.

---

## 5 · What I would like back

`DECISION-28` to `DECISION-32`, each with a short rationale, in the same ID convention, so they fold into an amended v5.2 without renumbering.

**`DECISION-29` is the one I would not wait on.** It is a stop instruction against a document I wrote that would put a withdrawn commercial model into production copy, Stripe descriptions and email templates, two of which are not under version control and are not revertible.

Everything else can take as long as it takes.
