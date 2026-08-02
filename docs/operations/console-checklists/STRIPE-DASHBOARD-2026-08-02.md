# Checklist B: the Stripe dashboard

**For:** Giuseppe, by hand, in the Stripe dashboard
**Date:** 2 August 2026
**Why it exists:** what a member reads on a card statement and in a Stripe
receipt is not all under this repository's control, and none of it can be
asserted on by a test here.

**Do not send me a secret key, a restricted key, a webhook signing secret or
any token.** Nothing here needs one. If a step seems to require credentials, the
step is wrong.

**Labels move.** Stripe reorganises its dashboard regularly. This says what to
look for, not where a menu sat on one afternoon.

**Do this in Live mode and then Test mode.** A wrong description in Test mode is
harmless until somebody copies it into Live.

---

## What the code actually does, so you know what you are looking at

I checked this rather than assuming it, and the finding shapes the whole
checklist:

- **Nothing in this repository creates a Stripe Product or Price.** The only
  checkout, `app/api/credits/checkout/route.ts`, builds an inline `price_data`
  with a name and a description on every request. So any Product or Price
  sitting in the dashboard was created **by hand**, and nothing in the codebase
  will ever correct it.
- **There is no Deal Room checkout at all.** Activation as a paid event is item
  3 of the eleven unbuilt items in ADR-0028. **No $79 charge has ever reached
  Stripe from this product.**
- The credits checkout writes metadata `user_id`, `pack`, `credits`. None of
  those keys or values contains "publish" or "activate", so **there is nothing
  to migrate and no dual-read handling to add.**

Which means: if the dashboard contains a Deal Room product, somebody created it
manually, and it is the only place the old "publish" wording can still be
live.

---

## B1 · Search for the wrong verb, before browsing anything

Use the dashboard search rather than walking the menus. Search each term across
Products and Prices:

| Search | Expected | If found |
|---|---|---|
| `publish` | **nothing** | This is the finding that matters most. A receipt line saying "publish" is as damaging as a button saying it. Rename to "Ponte Deal Room activation". Record the object id. |
| `Deal Room` | probably nothing, since no code creates one | If a Product exists, check its description against B2 |
| `active days` | **nothing** | Replace with "30 calendar days" |
| `Ponte` | the credits product, if one was made by hand | Continue to B3 |

---

## B2 · If a Deal Room product or price exists

Check each of these on it:

| # | Check | Correct |
|---|---|---|
| B2.1 | The name and description do not use publish, published or publishing | "Ponte Deal Room activation" |
| B2.2 | The period is not "30 active days" | "30 calendar days" |
| B2.3 | It is a **one-time** price, not recurring | ADR-0028: activation is a single charge for a fixed period. A `recurring` price would auto-renew a room the member has not chosen to reactivate, which the product does not do and has never said it does. |
| B2.4 | The statement descriptor does not say publish | Something a member will recognise, e.g. `PONTE DEAL ROOM` |
| B2.5 | No description implies a subscription, a plan, a tier, or a credit balance | One product, one price, one period |

**B2.3 is the one worth pausing on.** A recurring price is not a copy problem.
It would charge somebody again without an act of activation, which contradicts
"Ponte will not charge this account on any other trigger". If you find one,
tell me before changing it, because it may mean a real charge has happened.

---

## B3 · The credits product

Ponte Credits are a retired commercial model (ADR-0020 supersedes them). The
route that sells them has **no caller anywhere in the interface**, so nothing
can currently be bought through it, but the endpoint still exists and the
historical purchases are real records.

| # | Action | Why |
|---|---|---|
| B3.1 | **Archive the product. Do not delete it.** | Deleting breaks the receipt and the reporting history for anybody who ever bought one. Archiving stops new purchases and leaves the past intact. |
| B3.2 | Do the same for its prices | Same reason |
| B3.3 | Do **not** touch, edit or refund any existing PaymentIntent, Charge or Customer | Historical payment metadata is never rewritten. It must stay processable. |
| B3.4 | Check the description does not imply an ongoing balance, subscription or plan | "Credits pay for counterparty verification" is the current inline text; if a hand-made product says more than that, it is stale |

**Archiving is safe and reversible; deleting is not.** If Stripe offers only
"delete" for an object, leave it and tell me.

---

## B4 · Webhooks

| # | Check | Why |
|---|---|---|
| B4.1 | List the configured webhook endpoints and their subscribed events | `app/api/webhooks/stripe/route.ts` is the only consumer in this repository |
| B4.2 | Note any endpoint pointing somewhere that is not the current production host | A stale endpoint silently drops fulfilment |
| B4.3 | **Do not rotate the signing secret** as part of this checklist | Rotation is a deployment action, and deployments are yours to schedule, not a side effect of an audit |

---

## What to record

```
Mode: Live / Test
Products found: <name, id, one line each>
"publish" matches: <ids, or none>
"active days" matches: <ids, or none>
Recurring Deal Room price found: <yes + id / no>
Credits product: <archived / already archived / not present>
Webhook endpoints: <url + events, one line each>
Anything you were unsure about: <...>
```

Paste it back and I will file it in `docs/operations/OPERATIONS_LOG.md`.

---

## What cannot be verified from code, and is therefore not done until you do it

- **No test here can read the Stripe dashboard.** `promise-vocabulary` asserts
  on every description string this repository *sends* to Stripe. It cannot see
  a Product somebody typed into the console.
- **The `charging.ts` descriptions are correct and unshipped.** They are
  computed and never persisted, and no code path sends them to Stripe yet, so
  they are the wording that *will* be used rather than wording that is live.
- Until this checklist comes back, **the P1-2 correction is complete in the
  product and unverified in Stripe.**
