# Console addendum: the first-activation waiver

**For:** Giuseppe, by hand, in the Stripe dashboard and the Supabase dashboard
**Date:** 2 August 2026
**Authority:** `ADR-0029`
**Extends** `STRIPE-DASHBOARD-2026-08-02.md` (checklist B) and
`SUPABASE-EMAIL-TEMPLATES-2026-08-02.md` (checklist A). **Neither is replaced.**
Do those first; this covers only what `ADR-0029` adds.

**Do not send me a secret key, a restricted key, a webhook signing secret or any
token.** Nothing here needs one. If a step seems to require credentials, the step
is wrong.

---

## Already covered, so do not do it twice

The `30 active days` → `30 calendar days` correction is **already in both
checklists** — Stripe B2.2 and line 53, Supabase A5. `ADR-0029` confirms that
wording rather than changing it, and the authority file itself has now been
corrected to match at lines 98, 281 and 492.

Nothing below repeats it.

---

## Why there may be nothing to do yet

Stated first so you do not hunt for objects that cannot exist.

**No `$79` charge has ever reached Stripe.** The Stripe checklist establishes
that nothing in this repository creates a Stripe Product or Price, and that the
Deal Room charge is unbuilt. `deal_room_entitlements` is estimated at **zero
rows**. The waiver is unbuilt too, and cannot be built until the organisation
uniqueness rule is decided.

So this addendum is mostly **a list of things to check are absent**, and a
specification for whoever builds them later. That is worth more than it sounds:
an absent object confirmed absent is a fact, and it is the cheapest moment to
get the rules right.

---

## A · Stripe

### A1 · A waived activation must still be a recorded event

The hazard is specific. A waived first activation has **$0 due**. The obvious
implementation takes no payment at all, which means:

- **no PaymentIntent**, so nothing appears in Stripe;
- **no receipt**, so the member has no record of what they received;
- **no webhook**, so `deal_room_entitlements` is written by some other path, or
  not at all.

`ADR-0028` says the paid entitlement is created only after webhook-confirmed
payment. `ADR-0029` amends that to permit a waived entitlement recorded at $0
due — but if nothing writes it, **the waiver is not consumed**, and the member
can take it again. That is the failure mode to design against.

**Check now:** nothing to do in the dashboard. **Record the decision** on how a
$0 activation is evidenced before it is built. A Stripe `$0` invoice, an
internal ledger row, or both — but not silence.

### A2 · Objects that must NOT exist

Search Products and Prices for anything suggesting a free, trial, starter or
introductory tier.

| Look for | Expected | If found |
| --- | --- | --- |
| A Product named `Starter`, `Free`, `Trial` or similar | **none** | Archive, never delete. Note the id. |
| A Price of `0` on any Deal Room product | **none** | Archive. The waiver is a discount on $79, not a $0 price. |
| A Coupon or Promotion Code for the first room | **none** | Archive. See A3. |

**Why a $0 Price is wrong:** `ADR-0020` §17 requires the activation screen to
show `$79 USD` list, `minus $79 USD`, `$0 USD` due, and forbids a silently free
room. A $0 Price destroys the list price and there is nothing to show on the
middle line. The waiver must reduce a real $79, not replace it.

### A3 · If the waiver is ever built as a Stripe Coupon

Not a recommendation — a specification for whoever does it.

- It must be **100% off, once per customer**, never a duration or a trial.
- It must **not** be a `trial_period_days`. There is no subscription here and a
  trial implies one.
- The **description a member sees on a statement or receipt** must name the
  Deal Room and the period. Not "discount", not "promo".
- It must **never** be applied silently. `ADR-0028` requires the member to
  actively confirm; a coupon that applies itself at checkout defeats that.

### A4 · The disclosure rule reaches Stripe

`ADR-0020` §§4 and 11 forbid a participant learning branch count, **including
through a total billing amount**. A Stripe receipt is a surface.

**Check that no receipt, invoice line or statement descriptor states a branch
count or itemises per branch.** A line reading `3 additional branches — $45`
tells the recipient how many counterparties exist. One total, one description.

---

## B · Supabase email templates

### B1 · The one template, and what it may not become

`supabase/templates/README.md` records that **Confirm signup** and **Magic Link**
both carry `auth-otp.html`, whose only variable is `{{ .Token }}`. That is
sign-in and it is unaffected by pricing.

**Check that no auth template has acquired a price, a plan name, or the word
free.** Authentication email is not a place to state commercial terms, and a
price in a sign-in email dates the moment the price changes.

### B2 · Activation and receipt email does not exist yet

There is **no** activation email, no receipt email and no expiry-warning email
in `lib/email/`. When they are written, they are committed code sent through
Resend, **not** Supabase dashboard templates — the two surfaces are separate and
only the auth ones live in the dashboard.

**Nothing to check in the dashboard.** Recorded here so the absence is
deliberate rather than an oversight, and so nobody builds an activation receipt
as a Supabase template where it cannot be reviewed in a diff.

### B3 · The words that must not appear, when they do exist

For whoever writes them:

| Never | Why | Instead |
| --- | --- | --- |
| "free room", "your free Deal Room" | `ADR-0028` and `ADR-0029` both forbid a silently free room. The member received something worth $79. | "$79 USD, waived on your first activation" |
| "trial", "Starter plan", "upgrade" | There is no plan, no trial and no ladder. `ADR-0029` keeps those superseded. | "first activation" |
| "unlimited" | `P1-5` retired indefinite-storage promises. | state the term |
| a branch count | `ADR-0020` §§4 and 11 | omit |
| an expiry without a timezone | `ADR-0029` forbids a local civil time without its offset | UTC, with the offset stated |

---

## C · What I could not check, and will never be able to

Stated so nothing is assumed done.

- **Whether any of the above objects exist.** Nothing in this repository can
  read the Stripe dashboard or a Supabase-hosted template, and no AI is
  connecting to either. Only a human looking can answer A2 and B1.
- **Whether a Product created by hand months ago still carries old wording.**
  The Stripe checklist already establishes that nothing in the codebase will
  ever correct such an object.

Record what you find in `docs/operations/OPERATIONS_LOG.md`, including
"searched, found nothing" — an absence confirmed by a human is evidence, and an
absence nobody looked for is not.
