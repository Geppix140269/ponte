# ExecPlan — Deal Room transaction infrastructure pricing

**Status:** Stages 1, 2 and 3 delivered. Stages 4–9 not started and not authorised.
**Opened:** 31 July 2026
**Owner:** Giuseppe Funaro
**Commercial authority:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-31-01-DEAL-ROOM-TRANSACTION-INFRASTRUCTURE-PRICING-AUTHORITY.md` (`PT-COMMERCIAL-2026-07-31-01`, delivered by **open PR #155**)
**Decision record:** `docs/decisions/ADR-0020-deal-room-only-pricing-authority.md`
**Inventory:** `docs/codex/audits/deal-room-pricing/INVENTORY-2026-07-31.md`

> **Nothing in this plan is approval to perform a production action.** Migrations,
> Stripe configuration, secrets, environment values, feature flags, deployments,
> charging and merges each require separate explicit owner approval, per
> `AGENTS.md` stop conditions and authority §20–§21.

---

## 1. Purpose and user outcome

A member with a real commercial opportunity can pay **$79 USD** to open a Master
Deal Room for 30 active days, run up to five confidential principal-counterparty
negotiations inside it, add further concurrent branches at **$15 USD** each to a
**$199 USD** ceiling, work in any of five languages, and keep a permanent
read-only record afterwards — without a membership, a credit balance, a
subscription, a commission or a percentage of their trade.

Ponte, in turn, has exactly one thing to sell, one formula to explain and one
number to forecast.

**What is true today:** none of it. The Deal Room progression loop exists and is
proved against production (LB-001, 94/94 at Approval 3), but it is behind an
unset flag, and the commercial layer described above does not exist in any form.

---

## 2. Authority consulted

- `PT-COMMERCIAL-2026-07-31-01` — the governing commercial decision, read in full
- ADR-0020 — this programme's decision record and supersession map
- `PT-PRODUCT-2026-07-27-01` Deal Room Product Contract v1; `PT-PRODUCT-2026-07-27-02` Deal-to-Room Branching Model
- ADR-0003, ADR-0004, ADR-0005, ADR-0006 (the last three superseded within their commercial scope by ADR-0020)
- ADR-0009 (Deal Room technical architecture), ADR-0016 (multilingual), ADR-0018 (member-business verification is free)
- `design/authority/PONTE_DESIGN_CONSTITUTION_v1.md` v1.1 with ADR-0002, ADR-0010, ADR-0015
- `AGENTS.md`, `docs/codex/SOURCE-OF-TRUTH-SOP.md`, `docs/codex/00-START-HERE.md`
- `docs/codex/CURRENT-STATE.md`, `DATABASE-STATE.md`, `FEATURE-FLAGS.md`
- `docs/launch/LAUNCH-BLOCKERS.md`, `docs/launch/POST-LAUNCH-BACKLOG.md`, `docs/operations/OPERATIONS_LOG.md`, `docs/operations/OPEN_DECISIONS.md`

---

## 3. Current implementation discovered

The full record is the inventory. In one paragraph: `/pricing` sells Credits, a
success fee and a retainer and never mentions the Deal Room; the only Stripe
checkout in the repository sells credit packs with inline `price_data` and
references no Stripe Product or Price; the webhook is signature-verified,
server-side and idempotent but fulfils credits; `credit_ledger` /
`credit_purchases` / `spend_credits` / `credit_balance` and a 3-credit signup
trigger are live with real production rows; `counterparty_check` still charges 2
credits while `member_business` is free under ADR-0018;
`deal_room_entitlements.kind` admits only `starter`, `sponsored` and `waived` and
carries no money at all; `deal_room_sub_rooms.kind` and
`deal_room_participants.participant_class` contain the distinctions a
billable-branch predicate needs, but no such predicate exists; and the five
supported Deal Room languages already match the five in the price exactly.

**Reusable seams**, so later stages do not reinvent them:

- the webhook's idempotency pattern (pending row before the session, unique
  `stripe_session_id`, status-guarded fulfilment, 500-to-retry);
- `isStripeConfigured()` / `getStripe()`, which keep Stripe out of the build;
- `deal_room_entitlements`' separation of entitlement state from room lifecycle
  state, which is already what read-only continuity needs;
- `lib/ponte/progress.ts`-style pure-module discipline for the pricing engine;
- `lib/deal-room/language.ts` for billing-notice language resolution.

---

## 4. Scope

**In scope across the programme:** the pricing engine, the branch-counting
contract, billing records and entitlements, Stripe checkout and webhook, expiry
and reactivation, the public pricing page and Deal Room billing surfaces,
multilingual billing notices, retirement of credits and paid verification, and
the production preflight and rollout gates.

**Explicitly excluded, permanently:** memberships, plans, Starter rooms,
Portfolio subscriptions, credit packs, paid verification badges, public Ponte
Desk packages, retainers, commissions, success fees, percentage-of-transaction
charges, per-seat / per-document / per-message / per-gigabyte / translation
charges, euro-denominated Deal Room prices, and automatic currency conversion.

**Excluded from this PR (Stage 1):** every runtime change, `/pricing`, credit
removal, verification behaviour, migrations, RLS, Stripe objects, secrets,
environment values, charging, production data and deployment.

---

## 5. Product rules the implementation must not get wrong

1. **The client never determines an amount.** Price is computed server-side from
   server-held state and re-verified at fulfilment.
2. **A browser return is not a payment.** Write-enablement follows a verified,
   idempotent, server-side confirmation only (authority §9).
3. **A bill must not disclose branch structure.** No amount, line item,
   notification, receipt or error may let a branch participant infer that other
   branches exist, how many, or who is in them (authority §4, §10). This
   constrains the *wording* of every billing surface, not only its permissions.
4. **Only authorised Master Deal Room administrators** may see the active-branch
   count, purchased capacity and total room billing breakdown (authority §11).
5. **Payment grants no authority.** The billing sponsor gains no commercial,
   procedural, ownership, disclosure or approval right (authority §11).
6. **A pre-activation invitation never charges.** Unanswered, declined and
   expired invitations are free, always (authority §8).
7. **Expiry is read-only, never deletion**, and a room with no branch selected
   for resumption stays readable without payment (authority §12).
8. **Integer cents, USD only.** No floats, no conversion, no second currency.
   Write `USD` where `$` alone could be ambiguous.
9. **Closing a branch releases a slot and refunds nothing**; the slot may be
   reused inside the paid period at no further charge (authority §7).
10. **Above $199 in a period, further activations are free** in that period
    (authority §10).

---

## 6. Staged programme

Each stage is one reviewable PR unless stated. **Stages 2 onward are not
authorised by this plan.**

### Stage 1 — Authority reconciliation, inventory and plan *(this PR)*

Deliver ADR-0020 with the supersession map; mark the four superseded commercial
authorities and ADR-0004/0005/0006 without deleting them; update the ADR index,
Authority Manifest, Start Here, Current State, Decision Log, Open Decisions and
launch records; publish the verified inventory; open this plan.
**No runtime, schema, Stripe, production or deployment change.**

**Exit:** `npm run verify` green; owner review.

### Stage 2 — Domain model, branch-counting contract and pure pricing engine ✅ **delivered 31 July 2026**

The first substantive design task, and the one most likely to be got wrong.

- A **pure** `lib/deal-room/pricing.ts`: the constants, `roomPeriodPriceCents(activeBranchCount)`, the cap, and the additional-branch delta. No I/O, no database, no clock.
- A **billable-branch predicate** derived from authority §7's five conditions and mapped explicitly onto `deal_room_sub_rooms.kind`, `deal_room_sub_rooms.state`, `deal_room_participants.participant_class`, `deal_room_participants.state` and the agreement-acceptance join. Every inclusion and exclusion in §7 gets a named test.
- The exclusion of provider, adviser and internal workspaces asserted directly.
- The published price table (1–5 → $79 … 13+ → $199) pinned as a fixture.

**Exit:** tests only. No schema, no route, no UI, no charge.

### Stage 3 — Billing records and entitlements ✅ **delivered 31 July 2026 (migration written, NOT applied)**

- Migration **written, not applied**: a `paid` entitlement kind, room-period rows carrying currency, period price in cents, purchased branch capacity, period start and end, and a payment reference; a billing-event record.
- Idempotency and replay safety designed in, not added later.
- `STARTER_LIMITS_PROPOSED` retired behind the new model; `activeDays: 30` retained as the room period.
- `docs/codex/DATABASE-STATE.md` updated with the written-not-applied state.

**Owner gate:** applying the migration is a separate approval.

### Stage 4 — Stripe checkout and webhook

- A room-period checkout and an additional-branch checkout, both server-priced.
- Webhook fulfilment reusing the existing idempotency pattern; cap-aware, so a period already at $199 accepts no further branch charge.
- Failure, retry, duplicate-session and out-of-order-event behaviour specified and tested.
- No Stripe object created. Catalogue creation is Stage 9.

**Owner gates:** Stripe catalogue, secrets, webhook endpoint configuration.

### Stage 5 — Expiry, reactivation and the commercial ratchet

- Expiry → read-only, nothing deleted, participants retained.
- Reactivation as a new paid 30-day period priced from the branches selected to remain active.
- A room with no branch selected for resumption stays readable, free.
- No silent auto-renewal.

### Stage 6 — Public pricing and Deal Room billing surfaces

- `/pricing` rebuilt to **one product and one formula**, carrying authority §19's required statement verbatim in substance. **No multi-plan comparison grid.**
- Activation offer wording from authority §9.
- Additional-branch charge shown exactly and in advance (§10), worded so it discloses no branch identity or count.
- The administrator-only billing breakdown (§11).
- Footer blurb and the two `/about` paragraphs corrected. The `/about` legal-entity paragraph names the operating companies and their remuneration basis — **treat it as a legal text, not copy**, and get it confirmed.
- Design Constitution applies in full: approved tokens and components only, desktop and 390 × 844 evidence, reduced motion, owner design approval.

### Stage 7 — Multilingual billing notices

Activation, additional-branch, expiry and reactivation notices in English,
Spanish, Russian, Simplified Chinese and Modern Standard Arabic. Money stays
`USD`; Arabic preserves LTR trade identifiers and amounts inside RTL text
(authority §13). Depends on Stages 4–6.

### Stage 8 — Retire credits and paid verification

Staged and reversible, in this order: stop new grants (the signup trigger), stop
new purchases (checkout and packs), remove member-facing balance/cost/top-up
surfaces, then decide the ledger's fate. **`credit_ledger` records money real
members paid and must be preserved or migrated, never dropped.** The
`counterparty_check` half is blocked on **OD-011**.

### Stage 9 — Production preflight and rollout gates

Read-only production preflight; migration application; Stripe catalogue and
webhook configuration; environment and secrets; tax and legal-entity
confirmation; customer terms and refund policy; a rollback runbook; then, and
only then, charging. Every item is its own owner approval.

---

## 7. Migration plan

No migration is written or applied by Stage 1. From Stage 3 onward every
migration must be additive, idempotent where practical, based on the recorded
production state in `DATABASE-STATE.md`, inspected against the live schema before
proposal, and recorded in the ledger with its SHA-256. The existing
`deal_room_*` cluster is extended, never rewritten: it has been applied to
production and carries proved ACL and RLS contracts.

`credit_ledger` and `credit_purchases` are **retention-first**. No plan step
deletes a financial record.

---

## 8. Experience states

Every billing surface must answer: not yet payable; payable with the exact
amount; payment in progress; payment failed; paid and write-enabled; at the cap;
additional branch required with its exact cost; period expiring; expired and
read-only; reactivating; waived; and loading, error, blocked, resumed and
reduced-motion for each. Mobile at 390 × 844 is reviewed before desktop
approval.

---

## 9. Validation

`npm run verify` at every stage, with any environment failure recorded separately
from a repository failure. Pure-unit tests for the engine and the branch
predicate; replay and idempotency tests for the webhook; access-control tests
proving no billing surface leaks branch count across an isolation boundary;
five-language fixtures with Arabic RTL evidence; desktop and 390 × 844 evidence
for every surface; and production acceptance only after separately authorised
activation.

**A test that proves a price is correct is not a test that proves a bill is
safe.** The disclosure tests in Stage 2 and Stage 6 are the ones that matter
most.

---

## 10. Rollout and safe-disable

Charging is introduced behind an explicit gate, off by default, with the
`waived` entitlement kind remaining available throughout so the Deal Room loop
can be exercised without a charge. Safe disable at every stage means: no new
charge is created, existing paid periods run to their end, and nothing becomes
read-only earlier than it would have.

---

## 11. Progress log

**31 July 2026 — Stage 1 delivered.** ADR-0020 created with the fifteen-row
supersession map. Four commercial authorities and three ADRs marked superseded
within scope, none deleted. ADR index, Authority Manifest, Start Here, Current
State, Decision Log, Open Decisions and both launch registers updated. Inventory
published. LB-014 proposed; PL-032 to PL-038 opened; OD-011 opened.
`npm run verify` exits 0. No runtime, schema, Stripe, production or deployment
change. PRs #155 (authority) and #160 (reconciliation) merged in that order on
the owner's instruction; #162 recorded the outcome in the operations log.

**31 July 2026 — Stage 2 delivered, on the owner's instruction.**
`lib/deal-room/pricing.ts` and `lib/deal-room/__tests__/pricing.test.ts`,
**50 assertions**, registered in `npm test`. **No schema, no route, no UI, no
charge, and nothing imports the module** — the last of those is asserted by the
suite itself, so wiring it is a deliberate act in a later stage rather than a
drift.

What landed:

- **The pure engine.** `roomPeriodPriceCents(count)`,
  `additionalBranchChargeCents({paidCapacity, requiredCapacity})`,
  `isAtPeriodCap()`, `formatUsd()`, the six constants, and
  `PUBLISHED_PRICE_TABLE` pinned row by row against the engine so the printed
  table and the arithmetic cannot drift.
- **The billable-branch predicate.** `branchBillingVerdict()` walks authority §7's
  five conditions and returns a **named reason** on refusal
  (`supporting_workspace`, `not_write_enabled`, `invitation_not_accepted`,
  `no_admitted_counterparty`, `agreements_incomplete`), so the §11
  administrator-only breakdown can explain a charge later, and so every
  exclusion in §7 has a test that names it.
- **The mapping onto the live schema**, made explicit rather than implied:
  `BILLABLE_SUB_ROOM_KINDS = ['counterparty']`; `BILLABLE_SUB_ROOM_STATES =
  ['active','blocked','paused','outcome_reached']`;
  `REQUIRED_AGREEMENTS_FOR_BILLING` = the four-agreement admission gate.
  All eight sub-room states are decided one way or the other, asserted.
- **Two non-arithmetic properties**, which matter more than the sums:
  **purity** (the source may not contain a client, `fetch`, `process.env`,
  `Date.now`, `new Date` or `Math.random`, and its single import is type-only),
  and **non-disclosure** (prices are computed from a *count*; the facts types
  are checked against a **field allowlist** so no identifier can be added
  without failing).

**Demonstrated rather than trusted.** The suite was proved to fail in three
directions before being accepted: raising the cap to $200 (6 failures), making
provider workspaces billable (4 failures), and adding an identifier to the facts
type. **The third attempt initially passed and should not have** — the
disclosure check scanned for `ref:` and a field called `subRoomRef` walked past
it on the capital R. That is why the test is now a field allowlist rather than a
forbidden-word scan; both `subRoomRef` and `counterpartyName` now fail it, and
so does a second import appearing in the engine.

**Two process notes worth keeping, because both nearly shipped a false claim.**

1. The first two `npm run verify` runs for this stage **exited 2, not 0**:
   `[...s.matchAll(re)]` in the test file needs `downlevelIteration` under a
   tsconfig that declares no `target` (TS2802, two call sites). Replaced with an
   `exec` loop. The tests themselves had passed both times — it was the
   typecheck that failed, several minutes later in the run.
2. That failure was briefly misread as a pass, because the background-task
   notification reports the **shell's** exit code, and the command ended in an
   `echo`. The exit code now goes to its own file. A run is green when that file
   says so, not when the notification does.

**31 July 2026 — Stage 3 delivered, on the owner's instruction. The migration is
written and NOT applied.**

- **`supabase/migrations/20260731e_deal_room_paid_room_periods.sql`**, SHA-256
  `3456e0b0862e6e4b306a2cca1db430f50fb0416f043afa3e8cee6066ff78a422`. Additive
  throughout: `paid` added as a fourth entitlement kind (the three existing
  values preserved, no backfill), `deal_room_room_periods`,
  `deal_room_billing_events`, and `deal_room_entitlements.current_period_id`.
- **Three invariants pushed into the database**, because getting them wrong
  takes money from a member incorrectly: price is CHECKed against the
  authority's own formula so a row whose price does not follow from its capacity
  cannot be written at all; the $199 cap is stated again independently of the
  formula; and a partial unique index permits **one active period per room**, so
  a retry or a race cannot bill one room twice for one window.
- **The §17 value anchor is structural.** `period_price_cents` holds the list
  price and stays bound to the capacity formula, `discount_cents` holds the
  waiver, and `amount_due_cents` is a **stored generated column**, so a
  100% launch-partner room still records that a Deal Room costs $79 USD.
- **§9 is a constraint, not a convention:** `state <> 'active' or confirmed_at
  is not null`. A period cannot be active without a server-side confirmation.
- **Replay safety designed in**, not added after a double charge:
  `provider_event_id` is unique where not null, and the billing table is
  append-only against the table owner as well as against members.
- **The disclosure rule is in the policy.** Both tables are readable only by
  `deal_room_can_administer(room_id)` — narrower than every other member-facing
  Deal Room table — because `purchased_branch_capacity` is a branch-count
  disclosure under §4 and §11. No member holds any write policy. Per the LB-008
  lesson, `anon` and `authenticated` are revoked explicitly and `authenticated`
  is re-granted SELECT alone.
- **`lib/deal-room/billing.ts`** is the pure TypeScript half: the vocabularies
  mirroring each CHECK, `periodEndFrom()`, `periodCovers()`, `amountDueCents()`,
  `draftRoomPeriod()` and `launchPartnerWaiver()`. No clock — a period end is
  derived from a start that is passed in.
- **`lib/deal-room/__tests__/billing.test.ts`, 35 assertions**, registered in
  `npm test`. It evaluates the SQL price formula and the TypeScript engine side
  by side at every capacity from 5 to 40, pins each TypeScript vocabulary
  against its CHECK constraint, and asserts the administrator-only policy, the
  absence of any member write policy, the grants, the idempotency index and the
  append-only trigger. **Proved to fail in three directions**: cap drifted to
  $200, policy widened to any participant, idempotency index removed.
- **Nothing imports `billing.ts`, and no file under `app/`, `components/` or
  `lib/` names either new table.** Both are asserted, so a reader cannot ship
  ahead of the migration — which is how PL-014 happened.

**An existing guard caught the new function, correctly.**
`lib/deal-room/__tests__/grant-signatures.test.ts` discovers every migration
later than `20260729b` and refuses any `deal_room_*` function it does not
recognise — the guard that exists because an accidental overload leaves every
grant pointing at the old function (LB-005), and because a new `deal_room_*`
function is a new privilege surface (LB-008). It failed on
`deal_room_billing_append_only` with "Classify it deliberately", and had no seam
for a legitimately-new function. One was added: `NEW_SINCE_20260729B`, a name to
reason map, checked so a classification cannot be a placeholder and cannot rot
into a name no migration declares. An **unclassified** new function still fails,
demonstrated.

**Deviation from this plan's own Stage 3 bullet, stated rather than done
quietly.** The bullet said `STARTER_LIMITS_PROPOSED` would be "retired behind
the new model". It has **not** been removed. It has two live call sites —
`app/[locale]/deal-rooms/propose/page.tsx` prints the Starter limits as member
copy, and `app/[locale]/deal-rooms/[roomId]/page.tsx` renders `usageSummary()`.
Removing it would change what a member reads on two Deal Room surfaces, which is
Stage 6 work under the Design Constitution, not a records-and-schema stage. The
constant stays until then. `activeDays: 30` is superseded in fact by
`ROOM_PERIOD_DAYS` in `billing.ts`, which is the value the paid model uses.

---

## 12. Decisions and discoveries

1. **The authority is not yet on `main`.** PR #155 was open when this plan was
   written, so every citation of `PT-COMMERCIAL-2026-07-31-01` points forward.
   **This PR must merge after #155.** No competing copy of the authority was
   created.
2. **The public site was selling something no accepted authority described.**
   Credits, a success fee and a retainer are on `/pricing` today; the four
   accepted commercial authorities described a Starter room, a Portfolio
   subscription and credit packs. Neither set matches the other, and now neither
   matches the owner's decision. This is the single largest gap the inventory
   found.
3. **`counterparty_check` is a genuine ambiguity, not an oversight.** Authority
   §15 forbids "paid verification" flatly; ADR-0018 spent its length arguing that
   checking someone else's company is a different act from verifying your own.
   Both readings are defensible and an agent must not pick. **OD-011.**
4. **The branch vocabulary was already right.** `sub_rooms.kind` and
   `participants.participant_class` carry the exact distinctions the price needs
   and predate the authority by two days. Verify against §7 rather than assume.
5. **Stage 2 hit one genuine ambiguity, and it decides what members pay: does a
   broker's branch count? (OD-012.)** Authority §7 condition 1 says a billable
   branch is a "**principal**-counterparty Deal Branch", which reads like
   `participant_class = 'principal'` alone. But §4, listing what a Master Deal
   Room may contain, gives as one of its own examples "a broker acting for a
   disclosed or controlled principal" — and a broker is an `intermediary` in
   this schema, not a `principal`. The implemented reading counts intermediaries,
   because it follows §4's explicit example and because the alternative makes
   every brokered negotiation free, which is the larger commercial surprise. It
   is named in `BILLABLE_PARTICIPANT_CLASSES`, documented at the definition and
   pinned by a test that says so in its title, so reversing it changes one
   named constant and one named test rather than silently changing bills.
   **Owner confirmation required.**
6. **The ADR index is stale beyond the ADR-0012 collision it admits to.**
   ADR-0008, ADR-0009, ADR-0016, both ADR-0018 files and ADR-0019 have no row.
   Recorded as an observation; back-filling accepted decisions is an owner
   action and was not done.

---

## 13. Final evidence

Stage 1 only. Baseline `origin/main` `57389826ca8f3acec703f3a5553a5694ae05f8d1`,
clean worktree, `npm run verify` exit 0 before and after the change.
Documentation only: no application file, schema file, migration, script or
message fragment is modified by this PR.

**Limitations, stated plainly.** Nothing in this plan is implemented. The pricing
model is recorded, not built and not live. No production system was inspected,
changed or charged.
