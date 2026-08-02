# Ponte Trade — P2, decisions landing on live code and copy

**For:** Claude Code
**From:** UX/UI Director
**Date:** 2 August 2026
**Design approval needed:** No. All wording is given verbatim or derived from a numbered decision.
**Dependency:** Ships after P1 (PR #226). Independent of all design and Deal Room work.

Five decisions taken today land on code and copy that is already live. `DECISION-21` is a sequence, not a delete, and it is the only item here with real breakage risk.

**Standing constraint, unchanged and absolute: no production SQL.** Nothing in this ticket requires schema work. If any item appears to, stop and say so.

---

## P2-1 · Withdraw credits — `DECISION-21`

Credits were removed from the product by `AUTH-01`. A credits route still exists in the codebase with a Stripe path attached. It is dead product surface reachable by an accidental link.

**Do not blindly delete it.** The sequence, in order:

1. **Disable new credit purchases.** No new checkout can be initiated.
2. **Redirect the public credits route** to current Deal Room pricing.
3. **Archive the Stripe product and prices** so they cannot be purchased, without deleting them.
4. **Preserve historical payment records and webhook compatibility.** Any past credit purchase must remain processable and any in-flight webhook must still be handled.
5. **Inventory internal consumers** of credit state, balances and events. Produce the list.
6. **Remove obsolete code only after compatibility is proven**, not before.

Note the credits route currently uses inline `price_data`, so there may be no archivable dashboard product for it. Say what you actually find rather than assuming.

**Acceptance:** no reachable credit checkout · the public route redirects · historical records still processable · an inventory of internal consumers exists · code removal is either done with compatibility proven or explicitly deferred with a reason.

---

## P2-2 · Pricing copy is now Starter or $79 — `AUTH-01`, `DECISION-15`

Every price statement in the product currently says $79 with no free tier. That is now wrong.

**The model:** the **first Deal Room activation for each business-verified organisation is free for 30 calendar days**, with the same functional capability and capacity as a paid room. Renewal $79. Every subsequent room $79.

**There is no Starter feature set, no capacity restriction and no separate Starter interface.** The only difference is the price at activation. Do not introduce a Starter flag that gates capability; the entitlement affects price, nothing else.

**The entitlement attaches to a uniquely verified organisation, not to an email account.** Duplicate personal accounts must not yield additional free rooms.

Update: home page pricing line, any pricing page, activation copy, email templates, Stripe product and price descriptions, receipts. Same layering discipline as P1 — customer-visible strings change unconditionally, metadata and enums are inventoried first.

---

## P2-3 · Retention is now stated — `DECISION-16`

The product currently promises nothing about retention because nothing had been decided. That is over.

**Unauthenticated listing drafts.** Browser only. Retained **7 calendar days** after the last meaningful edit. Clearing browser data may remove the draft sooner.

Approved wording, verbatim:

> Saved only in this browser for up to 7 days. Sign in to keep it longer and continue on another device.

**Signed-in listing drafts and unactivated Deal Room drafts.** Retained **90 days** after the last meaningful edit or an explicit "Keep draft" action. Warnings at **14 and 3 days**. Then a **recoverable deleted state for 30 days**. Then permanent deletion unless a legal or security hold applies.

**Two behavioural requirements, not copy:**

1. **Opening a draft must not silently reset the clock.** Only a meaningful edit or an explicit "Keep draft" action does. This is the part most likely to be implemented wrongly by accident.
2. **No anonymous document uploads.** The document route requires sign-in. Any existing path that accepts a file from an unauthenticated session must be closed, and any anonymous file retention must be reviewed and ended.

Activated and concluded Deal Rooms follow their separate retention policy and are out of scope here.

---

## P2-4 · Never claim comprehensive screening — `DECISION-19`

v1 runs a **deliberately restricted compliance perimeter**: supported categories and jurisdictions, prohibited and restricted-goods rules, country and text-risk screening, member declarations of authority and legitimacy, automatic rejection or hold for clear risks, human escalation only for flagged cases, business and restricted-party checks at activation.

**Interface copy may state what was checked. It may never imply the checks are exhaustive, or that a counterparty is safe.**

Search for and correct any string implying comprehensive verification, full screening, "verified safe", "we check every", or a guarantee about a counterparty. This includes AI-generated copy — recall that `lib/ai-vet.ts` was regenerating a claim that the templates alone did not contain. **Check the prompts, not only the strings.**

Related and already correct: `Checked` is the status label for a submission passing automated checks. Not `Approved`, `Vetted` or `Reviewed`.

---

## P2-5 · Investigation copy must not promise an outcome — `PARAM-01`

"Ask Ponte to investigate" is a paid service at **$49** per Market Signal investigation, introductory v1 price, priced separately from the $79 and never bundled into publication.

**Defined deliverable, and copy must describe this and nothing more:**

- a source and freshness check
- a result: confirmed, not confirmed, or unable to confirm
- an evidence and source trail
- a recommended next action

**Payment buys the investigation, not a guaranteed opportunity, response or successful introduction.** State that plainly at the point of payment. No copy may imply that a paid investigation produces a counterparty, a reply, or a deal.

---

## P2-6 · Two things only a human can reach

Carried forward from your own P1 report, still open:

1. **Supabase-hosted email templates** are pasted in by hand and are not in the repository. Any P1 or P2 wording that lives in them will not be corrected by this ticket.
2. **Stripe dashboard product descriptions** are invisible to the codebase.

Both need Giuseppe in a console. Please state explicitly in the PR which corrections could not be made for this reason, so nothing is assumed done.

---

## Ordering

P2-1 first and on its own, because it is the only item that can break a payment path. Then P2-3, because the two behavioural requirements are real logic rather than strings. Then P2-2, P2-4 and P2-5 as a copy pass.

## Acceptance, overall

Written against exposed surfaces, as before. No reachable credit checkout, no unstated retention, no anonymous upload path, no claim of comprehensive screening anywhere including in prompts, no promised outcome on investigation, and pricing that says Starter or $79 everywhere a price appears.
