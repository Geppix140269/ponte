# Deal Room-Only Pricing Authority — verified repository inventory

**Date:** 31 July 2026
**Authority:** `PT-COMMERCIAL-2026-07-31-01` (Deal Room-Only Pricing Authority), delivered by **open PR #155**
**Decision record:** `docs/decisions/ADR-0020-deal-room-only-pricing-authority.md`
**Baseline:** `origin/main` at `5738982` (`57389826ca8f3acec703f3a5553a5694ae05f8d1`), clean worktree
**Method:** repository read only. No database was queried, no production surface was fetched, no Stripe object was inspected. Every claim below is a statement about the repository at that commit and about **nothing else**.

Where this document says a thing "exists", it means the code or SQL exists in the repository. It does **not** mean the migration is applied, the route is deployed, the flag is set or a member can reach it. `docs/codex/CURRENT-STATE.md` and `docs/codex/DATABASE-STATE.md` remain the only records of what production actually holds.

---

## 1. Current `/pricing` implementation

| Item | Finding |
|---|---|
| Route | `app/[locale]/pricing/page.tsx`, a server component. Classified `canonical` in `lib/navigation/route-manifest.ts:76`, noted "Commercial page; accepted current commercial decisions only." |
| Shell | `DeskShell` (migrated to the Desk generation by Issue #130 Stage 3). No commercial term changed in that migration. |
| Structure | Four `Engagement` panels in one `auto-fit` grid, plus a footnote. The page holds **no price literal of its own** — every string comes from the `pricing` namespace in `messages/en.json`, generated from `messages/_fragments/pricing.json`. |
| Reachability | Linked from `components/SiteHeader.tsx:21` ("Fees"), `components/SiteFooter.tsx:34`, `app/[locale]/verification/page.tsx:137`, `components/VerifyForm.tsx:413` (the credit-shortfall top-up), and `app/sitemap.ts:27` at priority 0.9. `components/ChromeGate.tsx:80` bares it. Four legacy routes redirect into it: `/catalogue`, `/advisory`, `/category/[slug]`, `/product/[slug]`. |

### The four published engagements

| Panel | Terms | Name | Price | CTA target |
|---|---|---|---|---|
| `marketplace` | Always · for everyone | The Marketplace | **Free** | `/structure` |
| `credits` | Per counterparty check | Credits | **2 credits** | `/verification` |
| `desk` | % agreed in writing · paid on closing | The Desk, per deal | **Success fee** | `/contact?engagement=desk` |
| `retainer` | Monthly · scoped to the mandate | The Desk, on your side | **Retainer** | `/contact?engagement=retainer` |

Intro line: *"…no listing fees, no subscriptions, no commission on deals you close yourselves. Credits pay for checking a counterparty. The desk is there if you want it."*

**Three of the four panels publish monetisation the authority prohibits** (authority §15): credit packs / usage currency, paid verification, a success fee, and a retainer. The Deal Room — the only paid product — **is not mentioned on the page at all**. The authority's required public statement (§19) and its "one product, one formula, no multi-plan comparison grid" rule are both unmet.

---

## 2. Stripe checkout and webhook code

| File | What it is |
|---|---|
| `lib/stripe.ts` | Lazy singleton. `isStripeConfigured()` reads `STRIPE_SECRET_KEY`; `getStripe()` throws when unset. Never instantiated at build time. |
| `app/api/credits/checkout/route.ts` | The **only** checkout in the repository. `mode: "payment"`, one line item, `currency: "usd"`, `unit_amount` from the server-side pack table (never from the request). Writes a `pending` `credit_purchases` row **before** calling Stripe. `success_url` → `/account?credits=added`; `cancel_url` → `/pricing?credits=cancelled`. Rate-limited 20/hour per user+IP. Answers 503 when Stripe is unconfigured. |
| `app/api/webhooks/stripe/route.ts` | Verifies the signature against `STRIPE_WEBHOOK_SECRET`; 503 when unconfigured, 400 on a missing or bad signature. Handles **`checkout.session.completed` only**; every other event is logged and acknowledged. Fulfilment is idempotent via `credit_purchases.status` and the unique `stripe_session_id`; a failure answers 500 so Stripe retries. A paid session with no purchase row is logged loudly and **not** retried. |
| `scripts/stripe-smoke.mjs` | Smoke script. |
| `package.json` | `stripe` `^16.12.0`. |

**No Stripe Product or Price object is referenced anywhere.** Prices are built inline with `price_data` at session-creation time. There is therefore no Stripe catalogue for this repository to be consistent with, and nothing in the code names a Deal Room.

**Assessment against the authority.** The webhook's shape is right — signature-verified, server-side, idempotent, and it never trusts the browser return, which is exactly authority §9's requirement. Its *subject* is wrong: it fulfils credit packs. A room period, an additional-branch charge and the ratchet to the $199 cap have no representation.

---

## 3. Credit balances, purchases and ledger

### Code

| File | Role |
|---|---|
| `lib/credits.ts` | The ledger API. `COST_VERIFICATION_L2 = 2`, `COST_VERIFICATION_L3 = 2`. `getBalance()` → `credit_balance` RPC. `spendCredits()` → `spend_credits` RPC (balance check and insert under one row lock). `grantCredits()`, `grantGuestCredits()`, `refundSpend()`, `ledgerFor()`. Reasons: `spend_verification`, `grant_signup`, `purchase`, `refund_failed`, `admin_adjust`. |
| `lib/credits/packs.ts` | Three packs, **USD**: `starter` 25 credits / $25, `trader` 60 / $50, `desk` 150 / $100. The file's own comment records that the blueprint priced these in euro and the platform overrode it to dollars. |
| `app/api/credits/balance/route.ts` | Returns balance, ledger and `prices: { verification: COST_VERIFICATION_L2 }`. |
| `app/api/credits/checkout/route.ts` | See §2. |

### Schema

| Migration | Objects |
|---|---|
| `20260721f_credits_and_ai_metering.sql` | `credit_ledger`, `credit_purchases`, `ai_calls` |
| `20260722d_signup_credits.sql` | Trigger granting **3 credits** at signup, once per user, guarded on an existing `grant_signup` row; a failure warns and never blocks account creation |
| `20260722e_handle_new_user_search_path.sql` | Pins the trigger's `search_path` |

The `20260722d` file records, in its own header, that before it existed every credit in production had been hand-inserted in the SQL editor — two `admin_adjust` rows and seven verification spends against them.

### Member-facing credit surfaces

`components/AccountGate.tsx` (balance/cost only in the paid `verify` context), `components/VerifyForm.tsx:396-413` (balance, cost, shortfall, and the `/pricing` top-up link), `components/check/CheckComposer.tsx:612,652,756` ("2 verification credits", "spend credits only now"), `app/[locale]/check/page.tsx:36`, `app/[locale]/verify/page.tsx:122,170`.

**Assessment.** Credits are a live, real subsystem with production rows and a signup grant. Authority §15 prohibits "credit packs, room credits, tokens or usage currency". Retirement is a staged programme with a data-preservation question attached — an append-only ledger recording money members paid cannot simply be dropped.

---

## 4. Verification payment dependencies

| Path | Commercial rule |
|---|---|
| `member_business` | **Free.** ADR-0018, PR #138. `lib/verification/pipeline.ts` and `app/api/verification/route.ts` guard the single `spendCredits` call, the balance read and the 402 on a `paidPurpose` derived from the normalised purpose. `credit_ledger_id` stays null. Enforced by `lib/verification/__tests__/member-business-free.test.ts`. |
| `counterparty_check` | **Paid, and still paid.** `app/api/verification/route.ts:98-104` reads the balance and answers **402** with `cost: COST_VERIFICATION_L2` when short; `lib/verification/pipeline.ts:194` spends 2 credits; `:485` refunds on a Ponte-side failure. `/check` and `CheckComposer` state the cost before the run. |
| Column | `verifications.credit_ledger_id`, nullable. Also read by `lib/deal-room/integrity.ts:94`. |

**Assessment.** ADR-0018 already moved half of this in the authority's direction and did so before the authority existed. The remaining half is a genuine conflict: authority §15 forbids "paid verification or verification badges" without qualification, and `counterparty_check` is paid verification by the plain reading of those words. It is also arguably a different act — a private check on a third party, not a verification of the member's own account — which ADR-0018 itself was at pains to separate. **An agent must not narrow an owner's prohibition by inference.** Recorded as **OD-011**, owner decision required.

---

## 5. Deal Room entitlement schema

`supabase/migrations/20260729a_deal_room_core.sql` §2, `public.deal_room_entitlements`:

```
id, room_id (unique, FK deal_rooms), org_id,
kind   check (kind in ('starter','sponsored','waived')),
state  check (state in ('eligible','reserved','active','grace','expired',
                        'suspended','restored','closed')),
reserved_at, activated_at, expires_at, ...
```

The migration's own comment reads: *"No price, no currency, no Stripe identifier, no invoice. Launch scope is Starter and authorised waiver."*

`lib/deal-room/entitlement.ts` holds `STARTER_LIMITS_PROPOSED` — `activeDays: 30`, `subRooms: 3`, `externalOrganisations: 2`, `internalUsers: 2` — explicitly labelled *proposed, not owner-accepted*, plus `daysRemaining()`, `starterExpiryFrom()`, `hasLapsed()`, `subRoomLimit()`, `guestOrganisationLimit()` and `usageSummary()`.

**Assessment.** The separation of entitlement state from room lifecycle state is exactly what the authority needs for read-only continuity, and `activeDays: 30` happens to match the room period. Everything else is wrong for the new model:

- `kind` has **no `paid` value** and the CHECK constraint would reject one;
- there is no price, currency, period-price, purchased-branch-capacity or payment-reference column;
- the limits enforced are Starter's sub-room and guest-organisation caps, which the authority supersedes;
- nothing counts branches, and nothing distinguishes a *billable* branch from any other.

A migration is required. **None is authorised, written or applied by this work.**

---

## 6. Master Deal Room and sub-room schema

Fifteen `deal_room_*` tables across `20260729a` / `20260729b` / `20260729c`, with `20260730b`, `20260730c`, `20260731a`, `20260731b` and `20260731c` correcting ACLs and command bodies. The two that matter for pricing:

**`deal_room_sub_rooms`** — `kind check (kind in ('counterparty','provider','adviser','internal'))`, `state check (state in ('draft','invitation_pending','awaiting_admission','active','blocked','paused','outcome_reached','closed'))`, unique `(room_id, ref)`.

**`deal_room_participants`** — `participant_class check (participant_class in ('principal','intermediary','provider','adviser','ponte_facilitator','observer'))`, `state check (state in ('invited','prerequisites_pending','terms_pending','admitted','active','suspended','removed','withdrawn'))`, plus `is_required_approver`, `is_room_administrator`, `org_id` / `declared_capacity`.

**Assessment.** The raw material for a billable-branch predicate is present and is better than it needed to be: `kind = 'counterparty'` separates a principal negotiation from provider, adviser and internal workspaces, which the authority says must never be charged, and `participant_class = 'principal'` separates a principal from an intermediary or observer. The states also map plausibly onto authority §7 — `draft` and `invitation_pending` are excluded, `active` / `blocked` / `paused` / `outcome_reached` are "commercially live", `closed` releases a slot.

But **no predicate exists**, nothing in the schema or the code counts branches for any purpose, and neither column was designed against the five-part test in §7. In particular §7 requires that admission and *required participation agreements* be complete before a branch counts, which is a join across `deal_room_participants` and `deal_room_agreement_acceptances`, not a column read. Mapping this is the first substantive design task of the programme, and it is a **design** task: getting it wrong either overcharges or leaks branch count.

---

## 7. Current multilingual Deal Room contracts

`lib/deal-room/`: `language.ts` (`DEAL_ROOM_LANGUAGES = ["en","es","ru","zh-CN","ar"]`, default `en`, RTL set), `language-detection.ts`, `interpretation.ts`, `glossary.ts`, `messages.ts`, `translation/`. Authority: ADR-0016; blocker: **LB-009, open, not started**; plan: `docs/plans/active/multilingual-deal-room-launch.md`.

`language.ts` documents at length that this list is deliberately **separate** from `i18n/routing.ts` (`locales = ["en"]`) and must never feed the site language switcher or locale-prefixed routing.

**Assessment.** The five supported languages in the code are **exactly** the five the authority includes in the price, `zh-CN` and `ar` included. There is no drift to reconcile. What is missing is commercial: no billing notice, checkout, receipt or expiry notice exists in any language, so authority §13's "multilingual billing notices" requirement has nothing to translate yet. The authority's scoped exception to the English-only policy is narrower than ADR-0016's product contract and does not widen it.

---

## 8. Public copy that contradicts the new authority

| Location | Text | Conflict |
|---|---|---|
| `messages/_fragments/pricing.json` → `credits.*` | "Credits", "2 credits", "Per counterparty check" | Credit packs / usage currency; paid verification (§15) |
| `messages/_fragments/pricing.json` → `desk.*` | "Success fee", "% agreed in writing · paid on closing" | Success fee; percentage-of-transaction (§15) |
| `messages/_fragments/pricing.json` → `retainer.*` | "Retainer", "Monthly · scoped to the mandate" | Retainer; public Ponte Desk package (§15) |
| `messages/_fragments/pricing.json` → `intro`, `meta.description` | "Credits pay for checking a counterparty. The desk is there if you want it." | Same three, restated |
| `messages/_fragments/footer.json` → `blurb` | "The desk manages your deal only when you ask, on a success fee or retainer." | Success fee; retainer (§15) — **on every page** |
| `messages/_fragments/about.json` §23 | "Credits pay for counterparty verification and intelligence work" | Credits; paid verification (§15) |
| `messages/_fragments/about.json` §39 | "available on a deal, on a success fee, when a member wants it" | Success fee (§15) |
| `messages/_fragments/about.json` §44 | "remunerated by success fee on closed deals" | Success fee (§15). **Legal-entity paragraph** — changing it is not a copy edit |
| `lib/navigation/route-manifest.ts:183` | `/advisory` → `/pricing`, "the success-fee option on /pricing" | Names a retired engagement in the route authority |
| `components/VerifyForm.tsx:413` | Credit-shortfall "top up" link to `/pricing` | Depends on `/pricing` selling credits |
| `lib/legal/content.ts:222-225` | Terms §6 "Fees" — "at the pricing published on the platform at that time" | Not itself a conflict; it is generic and survives. Recorded so it is not missed when the model changes. |

**No omission is claimed to be exhaustive beyond the searches run**: `grep -rilE "credit|success fee|retainer|subscription|starter|portfolio"` across `messages/_fragments/`, and targeted reads of `lib/legal/content.ts`, the route manifest and every file linking `/pricing`. Deferred locale files under `messages/_deferred/` were not reconciled — they are not served.

---

## 9. Classification of every issue found

Per `AGENTS.md` Launch Mode. An agent may recommend a classification; only the owner may make it.

### Proposed Launch Blocker (owner classification required)

| ID | Issue |
|---|---|
| **LB-014** | The public `/pricing` page, the site-wide footer blurb and two `/about` paragraphs publish a commercial model the binding authority retires — Credits, a success fee and a retainer — and never name the only paid product. Recorded in `docs/launch/LAUNCH-BLOCKERS.md` as **Proposed**. Recommended as a blocker because it is a public commercial representation that contradicts an accepted owner decision, which is a legal/commercial-representation risk rather than a code defect. **The owner decides.** |

### Post-Launch Tickets (recorded, not implemented)

| ID | Issue |
|---|---|
| PL-032 | No pricing engine, no branch-counting contract, no billing record and no entitlement model for the $79/$15/$199 formula. Nothing to fix — everything to build. Covered by the ExecPlan. |
| PL-033 | `deal_room_entitlements.kind` admits no `paid` value and the table holds no price, currency, period price, purchased branch capacity or payment reference. Migration required; not authorised. |
| PL-034 | The Stripe integration sells credit packs. It needs a room-period checkout, an additional-branch charge, cap-aware fulfilment and its own idempotent webhook path. No Stripe object is referenced today, so there is no catalogue to migrate — only one to create, under separate approval. |
| PL-035 | Ponte Credits (`credit_ledger`, `credit_purchases`, `spend_credits`, `credit_balance`, the 3-credit signup grant trigger, the packs table and every member-facing balance/cost/top-up surface) must be retired. Staged, with a data-preservation decision: the ledger records money members paid. |
| PL-036 | `STARTER_LIMITS_PROPOSED` and the `starter` entitlement kind are superseded. `activeDays: 30` survives as the room period; the sub-room, guest-organisation and internal-user caps do not. |
| PL-037 | No billing notice, receipt, checkout or expiry notice exists in any of the five supported Deal Room languages, so authority §13's multilingual billing requirement has nothing to translate. Depends on PL-032 and PL-034. |
| PL-038 | `lib/navigation/route-manifest.ts:183` describes `/advisory` as redirecting to "the success-fee option on /pricing", naming a retired engagement inside the route authority. One line, deferred with the rest of the copy so the page and its manifest change together. |

### Observations (no ticket)

1. **The webhook's safety properties are already right.** Signature verification, server-side-only fulfilment, idempotency on a unique session id, retry-on-failure and explicit refusal to trust the browser return are all what authority §9 asks for. The Deal Room work should reuse the pattern rather than reinvent it.
2. **The sub-room and participant vocabularies were built well enough to price against.** `kind = 'counterparty'` and `participant_class = 'principal'` are the distinctions authority §5 and §7 need, and they predate the authority by two days. That is luck, not design, and it should be verified against §7 rather than assumed.
3. **ADR-0018 anticipated this authority.** It reasoned from ADR-0004 that a toll in front of publication suppresses supply, and removed one. The new authority generalises the same argument.
4. **The five Deal Room languages already match the five in the price** exactly, `zh-CN` and `ar` included. No language reconciliation is needed.
5. **`lib/credits/packs.ts` already chose USD over the blueprint's euro**, and said so in a comment. The authority's USD-only rule ratifies a decision the code had already made.
6. **The ADR index in `docs/decisions/README.md` is stale** beyond the ADR-0012 collision it documents: ADR-0008, ADR-0009, ADR-0016, ADR-0018 (both files of that number) and ADR-0019 have no row. This PR adds ADR-0020's row and records the wider gap; renumbering or back-filling accepted decisions is an owner action and is **not** done here.
7. **Nothing about this authority is implemented, and the loop can still be exercised without it.** `deal_room_entitlements` already supports `waived`, so LB-001 and LB-009 can be closed under an authorised waiver without charging anybody. Charging is not on the critical path to a working Deal Room unless the owner puts it there.

---

## 10. What this inventory did not do

- It did not query the production database. Row counts, applied migrations and live Stripe state are unverified here and remain owner-held facts recorded in `DATABASE-STATE.md` and `OPERATIONS_LOG.md`.
- It did not inspect the Stripe dashboard, so whether any Product, Price or webhook endpoint exists there is **unknown**, not zero.
- It did not fetch `https://ponte.trade/pricing`. The public page is described from its source and its message fragments; which commit is deployed is unrecorded (see `CURRENT-STATE.md`, "The deployed commit is not recorded anywhere").
- It did not reconcile `messages/_deferred/*.json`, which are not served.
