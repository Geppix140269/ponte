# Credits withdrawal: the inventory of internal consumers

**`DECISION-21`, step 5.** 2 August 2026.

Step 6 of the sequence forbids removing code before compatibility is proven.
This is the list that makes "proven" possible, and it is the reason nothing was
deleted in this pass.

---

## The two halves, kept apart on purpose

Withdrawing credits is two different acts, and only the first was decided:

| | Status |
| --- | --- |
| The way **in** — buying credits | **Closed now** |
| The **record** — balances, ledger, past payments | **Kept, permanently** |

Somebody who bought credits owns them. A withdrawal that erased the balance,
the ledger, or the ability to fulfil an in-flight payment would turn a
completed purchase into a support case.

---

## Consumers of credit STATE

Read from the source, function by function.

| Function | Consumers | Disposition |
| --- | --- | --- |
| `spendCredits` | `lib/verification/pipeline.ts` | **Live.** A member with a balance can still trigger a spend. Must not be removed. |
| `refundSpend` | `lib/verification/pipeline.ts` | **Live.** A failed spend must be returnable. |
| `InsufficientCredits` | `lib/verification/pipeline.ts` | **Live.** The refusal path. |
| `getBalance` | `app/api/credits/balance/route.ts`, `app/api/verification/route.ts`, `app/[locale]/verify/page.tsx` | **Live.** Reading what you own. |
| `ledgerFor` | `app/api/credits/balance/route.ts` | **Live.** The record of what became of it. |
| `grantCredits` | **none** | No caller. Removal candidate once the balance path is settled. |
| `grantGuestCredits` | **none** | No caller. Same. |

`components/AccountGate.tsx` fetches `/api/credits/balance`, so the balance
endpoint has a live consumer in the interface and cannot be withdrawn with the
checkout.

---

## Payment surfaces

| Surface | Before | Now |
| --- | --- | --- |
| `POST /api/credits/checkout` | Created a Stripe checkout session from `price_data` | **410 Gone**, naming `/pricing`. No Stripe client, no line items. |
| `GET /api/credits/checkout` | did not exist | **308 to `/pricing`**, so a person following an old link lands somewhere useful instead of on JSON |
| `GET /api/credits/balance` | balance, ledger, prices, **and a purchasable pack list** | balance, ledger, prices, `purchasable: false`. The pack list is gone: it was a price list for a thing that now answers 410. |
| `POST /api/webhooks/stripe` | fulfils credit sessions | **Unchanged, deliberately.** |

### Why the webhook was not touched

A session created before this change can still be paid after it. Stripe retries
until it gets a 2xx, so a webhook that stopped understanding credits would
retry indefinitely against money that has already left an account.

`fulfilCredits` is idempotent and keyed on the `credit_purchases` row, so a
retry after fulfilment is a no-op. That property is what makes leaving it
safe, and it is pinned by test.

---

## Step 3, Stripe: there is nothing to archive, and here is why

The checkout built an **inline `price_data`** on every request. It never
created a Stripe Product or Price object, so **there is no dashboard object for
this route to archive**.

This confirms what the P1 Stripe checklist predicted rather than assumed: if a
Ponte credits Product exists in that dashboard, a human created it by hand, and
nothing in this repository will ever correct or archive it.

**Not verifiable from code.** `docs/operations/console-checklists/STRIPE-DASHBOARD-2026-08-02.md`
section B3 covers it: archive, never delete, and do not touch any existing
PaymentIntent, Charge or Customer.

---

## Step 6: removal, explicitly deferred

**Nothing was deleted in this pass, and that is the instruction rather than
caution.**

| Candidate | Blocked on |
| --- | --- |
| `lib/credits/packs.ts` | Now unreferenced by any route. Safe to remove once the balance response has shipped without `packs` and nothing external is reading it. |
| `grantCredits`, `grantGuestCredits` | No callers today. Removal is only safe once the signup-credit migration path is confirmed dead in production data. |
| `lib/credits.ts` entirely | **Not a candidate.** `lib/verification/pipeline.ts` spends and refunds. |
| `credit_purchases`, the ledger tables | **Never.** Historical payment records. |

The condition for step 6 is compatibility *proven*, and the evidence that would
prove it does not exist yet: nobody has read production's credit tables. That
belongs to the `WO-2` reconciliation, not to this ticket.

---

## What this ticket could not reach

Stated so nothing is assumed done:

- **The Stripe dashboard.** If a credits Product exists there, only a human can
  archive it.
- **Supabase-hosted email templates.** Any credit wording in them is invisible
  to this repository.
