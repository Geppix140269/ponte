# ADR-0020 — Ponte Deal Room is the only paid product, at $79 USD per 30 active days

- **Status:** Accepted by the product owner; effective when merged
- **Decision date:** 31 July 2026
- **Owner:** Giuseppe Funaro
- **Commercial authority:** `docs/ponte-authority/PT-COMMERCIAL-2026-07-31-01-DEAL-ROOM-TRANSACTION-INFRASTRUCTURE-PRICING-AUTHORITY.md`
- **Authority ID:** `PT-COMMERCIAL-2026-07-31-01`
- **Short reference:** Deal Room-Only Pricing Authority
- **Supersedes within scope:** ADR-0004, ADR-0005 and ADR-0006 where their
  commercial rules conflict; every earlier Deal Room commercial authority listed
  in the supersession map below
- **Implementation status:** **Nothing is implemented.** No pricing engine, no
  billing record, no entitlement change, no Stripe object, no migration, no
  runtime behaviour and no production action exists for this decision. This ADR
  records repository truth and authorises planning only.

## Dependency on PR #155

The commercial authority this ADR records is delivered by **PR #155**
(`agent/deal-room-transaction-pricing-authority`), which was **open and
unmerged** when this ADR was written. The authority file is therefore **not yet
present on `main`**.

This ADR deliberately does **not** carry a second copy of that file. A competing
copy of an owner decision is worse than a missing one: it creates two documents
that can drift.

**This pull request must not be merged before PR #155.** When #155 merges, the
path cited above resolves and every reference in this ADR, the Authority
Manifest, Start Here, Current State and the ExecPlan becomes live. Until then,
the citations point forward to an accepted decision that is not yet repository
authority, which is exactly what the Source-of-Truth SOP means by *Accepted;
binding after merge*.

## Context

Ponte's repository held **four** Deal Room commercial authorities and **three**
commercial ADRs, and they did not agree with one another or with the running
code.

- `PT-COMMERCIAL-2026-07-27-01` accepted the master Deal Room as the primary
  paid environment, with a free Starter exception and a list of permitted
  monetisation modes that included success fees and commissions.
- `PT-COMMERCIAL-2026-07-27-02` proposed a **€149/month or €1,490/year**
  Portfolio subscription and **€100–€400 Ponte Credit packs**.
- `PT-COMMERCIAL-2026-07-27-03` proposed a free Starter Deal Room, one per
  verified organisation.
- `PT-COMMERCIAL-2026-07-27-04` consolidated all of the above into a four-level
  ladder and remained *proposed*.

Meanwhile the deployed product charges for something else entirely.
`/pricing` publishes four engagements — a free marketplace, **Credits at 2 per
counterparty check**, a **Desk success fee** and a **Desk monthly retainer** —
and `lib/credits/packs.ts` sells 25, 60 and 150-credit packs through Stripe.
None of that was ever the accepted Deal Room model; it is the surviving
commercial surface of an earlier generation of the product.

So a contributor reading the repository could reach at least four different
answers to "what does Ponte charge for?", and the one the public site gave was
not among the accepted authorities.

The owner has now decided the commercial model outright.

## Decision

> **Ponte Deal Room is Ponte's only paid product and its sole day-one
> monetisation engine. A Master Deal Room costs $79 USD for 30 active days,
> including five concurrently active private principal-counterparty Deal
> Branches. Each additional concurrently active branch costs $15 USD for the
> current room period, and the total charge is capped at $199 USD per Master
> Deal Room per 30-day period.**

Everything upstream of protected Deal Room progression is free.

### Canonical pricing constants

All monetary values are stored and calculated as **integer cents**, in **USD
only**.

```ts
currency = "usd"
baseRoomPriceCents = 7900
includedActiveBranches = 5
additionalBranchPriceCents = 1500
maximumRoomPeriodPriceCents = 19900
activePeriodDays = 30
```

```ts
Math.min(
  19900,
  7900 + Math.max(0, activeBranchCount - 5) * 1500,
)
```

The cap is a **price** cap, not a branch limit: subject to security,
anti-abuse and reasonable-use controls, branches beyond the thirteenth do not
increase the room-period charge above $199 USD.

### What a billable branch is

A Deal Branch counts toward the price only when **all** of the following hold
(authority section 7, as amended):

1. it is a principal-counterparty Deal Branch — **including one whose admitted
   counterparty is an intermediary acting for a disclosed or controlled
   principal** (Amendment 1, 31 July 2026, closing OD-012: the owner resolved
   the conflict between §7's "principal-counterparty" and §4's own "a broker
   acting for a disclosed or controlled principal" in favour of §4, because the
   alternative would make every brokered negotiation free);
2. the intended counterparty has accepted the invitation;
3. admission and required participation agreements are complete;
4. the branch is write-enabled for protected commercial progression;
5. it is not closed, declined, withdrawn, expired or archived.

Draft branches, prepared or sent invitations, invitations awaiting acceptance,
declined or expired invitations, failed admissions, closed or archived
read-only branches, and **provider, adviser and internal workspaces** never
count. Closing a branch releases a slot for reuse inside the paid period and
generates no refund.

### Included at no extra charge

Browsing, publishing, room preparation, draft branches, invitations,
participants, advisers and specialists, documents, evidence, procedure,
audit history, the five supported languages and **permanent read-only history
after expiry** are all included. There is no per-user, per-document,
per-message, per-workspace, per-gigabyte or translation charge.

### Multilingual is included

English, Spanish, Russian, Simplified Chinese and Modern Standard Arabic are
included in the standard price. This creates a **scoped** exception to the
English-only interface policy for authenticated Deal Room participant surfaces
and Deal Room transactional notices only. It does not authorise a multilingual
public website. ADR-0016's product contract is unchanged and is now also a
commercial commitment: there is no multilingual plan, surcharge, quota or
translation credit.

### Payment boundary

The room becomes paid and write-enabled only after a **verified, idempotent,
server-side payment confirmation**. A browser return from a payment provider is
not authoritative. The client must never determine an amount. Billing
explanations must never expose branch identity, branch count or a competing
negotiation to a participant not authorised to see the branch structure.

### Expiry

Expiry makes a Master Deal Room and its branches **read-only**. Nothing is
deleted, no participant is removed, and agreements, evidence, translations and
activity remain intact. Reactivation creates a new paid 30-day period. There is
no silent auto-renewal at launch. The commercial record is never held hostage
behind a continuing subscription.

## Supersession map

Every row below is superseded **within its commercial scope** by
`PT-COMMERCIAL-2026-07-31-01`. The historical documents are **preserved, not
deleted or rewritten**; each now carries a superseded banner pointing here.

| # | Superseded rule | Where it was recorded | What now applies |
|---|---|---|---|
| 1 | **Starter Deal Room access** — one free limited real Deal Room per verified organisation | `PT-COMMERCIAL-2026-07-27-01` §2, §4; `PT-COMMERCIAL-2026-07-27-03` in full; `PT-COMMERCIAL-2026-07-27-04` §4; ADR-0006 | No public free Starter room entitlement. The free journey is everything up to activation (authority §8). Historical Starter-compatible schema values may remain for safe migration and audit only. |
| 2 | **Portfolio subscriptions** — €149/month or €1,490/year for 5 concurrent master rooms | `PT-COMMERCIAL-2026-07-27-02` §3; `PT-COMMERCIAL-2026-07-27-04` §5; ADR-0004 entitlement list | No membership or plan of any kind. One product, one formula, one-time 30-day purchase. |
| 3 | **Ponte Credits** — credit packs as a purchasable usage currency | `PT-COMMERCIAL-2026-07-27-02` §4; `PT-COMMERCIAL-2026-07-27-04` §6; `lib/credits/packs.ts` | No credit packs, room credits, tokens or usage currency. |
| 4 | **Credit-funded rooms** — 60 credits activates a room for 90 days; 20 credits extends it | `PT-COMMERCIAL-2026-07-27-02` §5; `PT-COMMERCIAL-2026-07-27-04` §6 | A room period is bought directly, in USD, for 30 days. |
| 5 | **Paid verification of a member's own business** | `PT-COMMERCIAL-2026-07-27-01` §5; ADR-0004 Consequences | Verifying a member's own business is free, permanently (ADR-0018). **Amended 31 July 2026 (Amendment 2, closing OD-011): the private `counterparty_check` — a check bought on a third party — is NOT this and stays paid.** It must move off Ponte Credits to a direct USD price, because §15's prohibition on credits is untouched. |
| 6 | **Paid verification certificates or badges** | `PT-COMMERCIAL-2026-07-27-01` §5 (investigation, evidence, verification and reporting services) | No paid certificate or badge. Gold remains a brand signal, never a verification status. |
| 7 | **Public Ponte Desk packages** | `PT-COMMERCIAL-2026-07-27-01` §6; `PT-COMMERCIAL-2026-07-27-02` §12; ADR-0004 "Relationship to Ponte Desk" | No public Ponte Desk package, tier or price. |
| 8 | **Retainers** | `PT-COMMERCIAL-2026-07-27-02` §12; `PT-COMMERCIAL-2026-07-27-04` §11; `/pricing` `retainer.*` | No retainer is publicly offered or priced. |
| 9 | **Success fees** | `PT-COMMERCIAL-2026-07-27-01` §5; `PT-COMMERCIAL-2026-07-27-02` §12; ADR-0004 Guardrails; `/pricing` `desk.*` | No success fee. |
| 10 | **Commissions** | `PT-COMMERCIAL-2026-07-27-01` §5 ("transaction, referral, completion or success fees") | No commission. Ponte is paid for controlled transaction infrastructure, not for brokering. |
| 11 | **Percentage-of-transaction pricing** | `PT-COMMERCIAL-2026-07-27-01` §5; `PT-COMMERCIAL-2026-07-27-04` §11 | Price is never linked to transaction value, quantity, revenue or commercial success (authority §2, §16). |
| 12 | **Euro-denominated Deal Room prices** | `PT-COMMERCIAL-2026-07-27-02` §3, §4; `PT-COMMERCIAL-2026-07-27-03` §11; `PT-COMMERCIAL-2026-07-27-04` §4–§6 | **USD only.** All canonical money records are USD; no automatic currency conversion. Use `USD` where `$` alone could be ambiguous. |
| 13 | **Unlimited commercially active principal-counterparty branches under one flat fee** | `PT-COMMERCIAL-2026-07-27-02` §9; `PT-PRODUCT-2026-07-27-02` §4, §10; ADR-0004 "One paid room per counterparty branch" rejection; ADR-0005 "Private sub-rooms do **not** consume additional master Deal Room slots" | Five concurrently active principal-counterparty branches are included; each further concurrent branch costs $15 USD, to the $199 USD cap. **Provider, adviser and internal workspaces remain unlimited and free** — the earlier rule survives for them and is narrowed only for principal-counterparty branches. |
| 14 | **Multilingual Deal Room surcharges or quotas** | Never formally proposed; prohibited pre-emptively | Five languages included at no charge. |
| 15 | **"Every private sub-room is commercially free regardless of principal-counterparty branch use"** | `PT-PRODUCT-2026-07-27-02` §4; ADR-0005 Commercial consequence | Superseded exactly as far as row 13 says and no further. |

### What is *not* superseded

The following remain fully in force and this ADR depends on them:

- **The branching hierarchy itself.** One commercial opportunity creates one
  Master Deal Room with several private, isolated negotiations beneath it
  (`PT-PRODUCT-2026-07-27-02`; ADR-0005). Only the *pricing* of those branches
  changes.
- **Branch isolation.** A participant must never learn that another branch
  exists, how many there are, who is in them, or what was discussed there — and
  **a billing total must never reveal branch count** to a participant not
  authorised to see the branch structure (authority §4).
- **The free upstream market.** Publishing a complete eligible Deal is free
  (ADR-0004, ADR-0005). This authority strengthens that rule.
- **Payment confers no authority.** The billing sponsor acquires no commercial,
  procedural, ownership, disclosure or approval right (ADR-0004, ADR-0005,
  authority §11).
- **Read-only continuity.** Expiry never deletes history (ADR-0006, authority
  §12).
- **ADR-0018.** Member-business verification is free. Consistent with, and
  extended by, this decision.
- **ADR-0016.** The multilingual Deal Room product contract. Now also a
  commercial commitment.
- **ADR-0009 / LB-001.** The Deal Room progression loop. This authority prices
  it; it does not redesign it.

## Consequences

1. **The public `/pricing` page contradicts binding authority.** It offers
   Credits, a success fee and a retainer, and never names the Deal Room. So do
   the footer blurb and two paragraphs of `/about`. Recorded as a **proposed
   Launch Blocker, LB-014**, for owner classification.
2. **A pricing engine must exist and must be pure.** Price is a function of
   billable branch count alone. It must be derivable, testable and free of I/O.
3. **Branch counting becomes a first-class domain concept.** Today
   `deal_room_sub_rooms.kind` distinguishes `counterparty` / `provider` /
   `adviser` / `internal`, and `deal_room_participants.participant_class`
   distinguishes `principal` from `intermediary`, `provider`, `adviser`,
   `ponte_facilitator` and `observer`. Those two columns are the raw material
   for a billable-branch predicate; **no such predicate exists**, and neither
   column was designed against the five-part test in authority §7.
4. **`deal_room_entitlements` cannot express this model.** Its `kind` CHECK
   admits `starter`, `sponsored` and `waived` only — there is no `paid` — and
   it holds no price, currency, period price, purchased branch capacity or
   payment reference. A migration will be required, and is **not authorised by
   this ADR**.
5. **`STARTER_LIMITS_PROPOSED` in `lib/deal-room/entitlement.ts` is
   superseded.** Its 30-day term survives as the room period; its 3 sub-rooms,
   2 external organisations and 2 internal users do not.
6. **The credits subsystem must be retired, carefully.** `credit_ledger`,
   `credit_purchases`, the `spend_credits` and `credit_balance` functions, the
   signup grant trigger and the Stripe credit checkout are live and hold real
   production rows. Retirement is a staged programme with a data-preservation
   decision attached, not a deletion.
7. **The Stripe integration is the wrong shape.** It sells one-off credit packs
   with `price_data` built inline. A room period, an additional-branch charge
   and a ratchet to the cap need their own checkout, their own idempotent
   webhook fulfilment and their own record.
8. **The paid `counterparty_check` conflict is resolved — it stays paid.**
   §15 forbade "paid verification or verification badges" without qualification,
   and §1 said the Deal Room is "the only paid product", so read flatly the
   authority retired a service Ponte intends to keep selling. **Owner decision of
   31 July 2026, closing OD-011: a check bought on a third party is not the paid
   verification §15 prohibits.** Recorded as **Amendment 2**, which amends both
   §15 and §1 — amending only §15 would have left the same contradiction one
   section earlier. The line is ADR-0018's: §15 prohibits charging a member to
   prove *themselves*, and `member_business` remains free permanently.
   **Two consequences:** Ponte Credits are still retired, so the check must be
   repriced as a direct USD charge rather than billed against a credit balance;
   and no badge, tier or certificate is created.
9. **Launch sequencing changes.** LB-001 (the Deal Room loop) and LB-009
   (multilingual) both now sit inside a product that must also be able to charge.
   Charging is **not** itself a launch blocker unless the owner says so: the loop
   can be exercised under an authorised waiver, which the schema already
   supports.

## Implementation boundary

This ADR authorises **repository truth and planning only**. It does not
authorise, and this pull request does not perform:

- any application runtime change;
- any change to `/pricing`;
- removal of credit code;
- any change to verification behaviour;
- any database migration or RLS change;
- any Stripe product, Price, catalogue or webhook configuration;
- any secret or environment change;
- enabling charging, processing a payment, or issuing a production waiver;
- any production-data change;
- any deployment.

The staged programme is `docs/plans/active/deal-room-transaction-pricing.md`.
Each production-changing category in it requires **separate explicit owner
approval**, per authority §20 and §21 and the stop conditions in `AGENTS.md`.

## Rejected alternatives

### Keep the Portfolio subscription and credits alongside the room price

Rejected by the owner. Two payment currencies for one product require two
entitlement engines, two refund policies and two explanations, and the credit
pack made the price of a Deal Room a division problem.

### Price per counterparty branch with no included allowance

Rejected. It penalises exactly the behaviour the product exists to support —
running several confidential negotiations for one opportunity — and it makes the
bill a disclosure channel for branch count.

### Price per Master Deal Room with unlimited branches

This was the previous accepted position (ADR-0005). Rejected now because a room
running thirty concurrent principal negotiations consumes materially more of the
controlled-progression product than one running two, and a flat fee cannot
express that. The $199 cap keeps the revised model from becoming per-seat
pricing by another name.

### Percentage of transaction value

Rejected in ADR-0004 and rejected again here, more strongly: attribution, delay,
legal structure and collection risk aside, a percentage makes Ponte a party to
the trade's value rather than a supplier of infrastructure to it.

## Related records

- `docs/ponte-authority/PT-COMMERCIAL-2026-07-31-01-DEAL-ROOM-TRANSACTION-INFRASTRUCTURE-PRICING-AUTHORITY.md` (PR #155)
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-01-DEAL-ROOM-MONETISATION-POLICY.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-02-DEAL-ROOM-LAUNCH-PRICING-V1.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-03-STARTER-DEAL-ROOM-ACCESS.md`
- `docs/ponte-authority/PT-COMMERCIAL-2026-07-27-04-DEAL-ROOM-LAUNCH-MODEL-V2.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`
- `docs/ponte-authority/PT-PRODUCT-2026-07-27-02-DEAL-TO-ROOM-BRANCHING-MODEL.md`
- `docs/decisions/ADR-0004-deal-room-monetisation-boundary.md`
- `docs/decisions/ADR-0005-free-deals-and-counterparty-room-branches.md`
- `docs/decisions/ADR-0006-starter-deal-room-access.md`
- `docs/decisions/ADR-0009-deal-room-technical-architecture.md`
- `docs/decisions/ADR-0016-multilingual-deal-room-interpretation.md`
- `docs/decisions/ADR-0018-member-business-verification-is-free.md`
- `docs/plans/active/deal-room-transaction-pricing.md`
- `docs/codex/audits/deal-room-pricing/INVENTORY-2026-07-31.md`
- `docs/operations/OPEN_DECISIONS.md` — OD-011
- `docs/launch/LAUNCH-BLOCKERS.md` — LB-014 (proposed)

---

## Amendment 3, 2 August 2026: the period is stated as 30 CALENDAR days

**Owner approved, 2 August 2026, on a correction raised by the design director.**

The price does not change. The period does not change. What changes is the
phrase used to describe it, because the phrase described something the product
has never done.

### What was wrong

This authority, and every surface quoting it, said **"30 active days"**. A
reader takes that to mean a clock that stops: days on which the room is used,
or days excluding some paused state. Nothing in Ponte has ever implemented
that. `periodEndFrom` in `lib/deal-room/billing.ts` is, and always has been:

```
start + ROOM_PERIOD_DAYS * 24 * 60 * 60 * 1000
```

Thirty days of wall time from the start of the period, which does not pause for
a blocked step, a paused branch, an unanswered invitation or anything else. The
interface was advertising a more generous accounting model than the code
implements, which is the direction of error that becomes a refund argument.

### What the interface says now

> "Activate this Deal Room for $79. Full functionality remains available for 30
> calendar days from activation."

And the **exact expiry date and time** is shown before any amount is taken. A
member buying a period is entitled to the instant it ends, not to a duration
and a calendar.

### Scope

This is a wording correction to match the implementation. It is **not** a
repricing and **not** a change to `ROOM_PERIOD_DAYS`, to `periodEndFrom`, to any
migration, or to any stored value. The title of this ADR and the quotations
inside it are left as they were written: they are the record of what was decided
on 31 July 2026, and rewriting an accepted decision to look like it always said
something else is not an amendment.

`lib/listings/__tests__/promise-vocabulary.test.ts` pins both halves: no
member-facing string says "active days", and the copy's promise is asserted
against the arithmetic in `periodEndFrom`, so the two cannot part again.

## Amendment 4, 2 August 2026: "publish" is never the paid room action

**Owner approved, 2 August 2026.** The entrance said **"$79 when you publish
it"**. Publish, everywhere else on the internet, means make publicly visible. A
Deal Room is private and stays private, so that line could reasonably be read
as *pay $79 to make my confidential deal public* — the opposite of the product,
offered at the exact moment a member decides whether to pay.

The three public actions, in these words, everywhere:

| Action | Object | Price |
| --- | --- | --- |
| **Publish a listing** | Member opportunity | Free |
| **Create a Deal Room** | Deal Room, draft | Free |
| **Activate a Deal Room** | Deal Room, active | $79 for 30 calendar days |

Because a member who read the old wording carries the old expectation, the
correction is also stated positively at the activation moment, beside the price
and **above** the payment control:

> "Activating does not make this room public. Its contents stay visible only to
> admitted participants."

The persisted vocabulary was already correct and is **not** swept:
`activation_pending`, `declined_before_activation`, `cancelled_before_activation`,
`room_activation`, `reactivation`. `listings.status = 'published'` also stays,
because a listing genuinely does publish and it is genuinely free; renaming it
would rename a free act to a paid one in the database to fix a caption.
