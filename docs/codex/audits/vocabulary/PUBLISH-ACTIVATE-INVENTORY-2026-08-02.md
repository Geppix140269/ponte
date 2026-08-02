# Inventory: publish / activate / vetted, by layer

**Date:** 2 August 2026
**Raised by:** UX/UI Design Director, `PONTE-P1-COPY-FIXES` v2
**Owner approval:** Giuseppe, 2 August 2026
**Rule applied:** step one is an inventory, not an edit.

This exists because v1 of the brief instructed a blind global replacement across
routes and enums, and that instruction was withdrawn. Renaming a persisted value
is not a copy correction: it can break existing rooms, payment callbacks,
webhook handlers and shared links. What follows is every occurrence that matters,
its layer, the decision taken, and the migration plan where one is needed.

---

## Layer 1 — Customer-visible copy, emails, Stripe descriptions, receipts

**Rule: must say activate. Changed unconditionally.**

| Where | Was | Now |
| --- | --- | --- |
| `components/home/landing/DealRoomPreview.tsx` | "$79 when you publish it, for 30 active days" | "$79 to activate it, for 30 calendar days." |
| `lib/deal-room/charging.ts` room activation | "Ponte Deal Room - $79 USD for 30 active days" | "Ponte Deal Room activation - $79 USD for 30 calendar days" |
| `lib/deal-room/charging.ts` reactivation | "Ponte Deal Room - a new 30-day period" | "Ponte Deal Room reactivation - a new 30 calendar day period" |
| `lib/deal-room/screens-example.ts` | "for 30 active days" | "for 30 calendar days", plus the non-disclosure statement and the exact expiry |
| `lib/deal-room/walkthrough.ts` | "30 active days"; "live in it for as long as you like" | "30 calendar days"; "Building the room is free. No activation period begins until payment." |
| `lib/deal-room/entitlement.ts` | "3 days remaining" | "3 days remaining, until 1 September 2026 at 14:32 CEST" |
| `messages/_fragments/{about,footer,pricing}.json` | "30 active days" | "30 calendar days" |
| `app/[locale]/market-signals/page.tsx` | "reviews it before anything is published" | the approved automated-checks sentence |
| `messages/_fragments/{about,contact,footer,find,marketplace}.json` | "vetted by the desk", "reviewed by the desk before", "In vetting", "Approved" | "checked automatically", "Being checked", "Checked" |
| `lib/legal/content.ts` | "reviewed by the desk before publication" | "checked automatically ... A flagged offer may require additional information or human review." |
| `app/[locale]/layout.tsx`, `app/manifest.ts` | "vetted marketplace", "verified by AI and a human desk" | automated checks, with the flagged path named |
| `lib/listings/decision-notes.ts` | "has been vetted and is now live" | "has cleared Ponte's checks and is now live" |
| `lib/ai-vet.ts`, `lib/verification/reconcile.ts` | system prompts telling the model `submitted` means "in vetting" | "being checked automatically" |

The AI prompts are in this layer, not a lower one, and that is the finding most
easily missed. `accountBrief` asks the model for **member-facing** next actions
and a **member-facing** email, having first told it that a submitted listing is
"in vetting". The promise was being regenerated on every account brief, so
correcting the templates alone would not have removed it.

---

## Layer 2 — Stripe metadata keys and values, webhook contracts

**Rule: inventory and migration category. Not unconditional replacement.**

**Finding: there is nothing to migrate, because no Deal Room charge reaches
Stripe yet.**

| Surface | Metadata written | Consumers | Decision |
| --- | --- | --- | --- |
| `app/api/credits/checkout/route.ts` | `user_id`, `pack`, `credits` | `app/api/webhooks/stripe/route.ts`, `credit_purchases` rows | **Unchanged.** No key or value contains publish or activate. Ponte Credits are a retired commercial model (ADR-0020) and this route has no caller in the interface, but the historical rows must stay processable. |
| Deal Room activation checkout | none | none | **Does not exist.** Activation as a paid event is item 3 of the eleven unbuilt items in ADR-0028. `ChargeIntent.description` is computed and never persisted. |

`ChargeIntent.kind` (`room_activation`, `additional_branch`, `reactivation`,
`waiver`) is already the correct vocabulary and is the value that would become
Stripe metadata when the checkout is built. **No dual-read handling is required
today**, and the note below records what will be required if this ever changes.

**Historical payment metadata: not rewritten, not touched.** No migration in this
change reads or writes `credit_purchases`, `deal_room_room_period_charges`, or
any Stripe object.

---

## Layer 3 — Internal routes

**Rule: inventory first, rename only where the identifier is the wrong domain
state, with migrations and redirects.**

| Route | Contains publish/activate? | Decision |
| --- | --- | --- |
| every route under `app/` | **No.** `find . -type d \| grep -iE "publish\|activat"` returns nothing. | **No rename. No redirect needed.** |

There is no `/publish`, no `/activate`, and no route segment naming either act.
Shared links are unaffected because no link shape changed.

---

## Layer 4 — Persisted enums and database values

**Rule: rename only where the identifier represents the wrong domain state.**

| Value | Table / constraint | Domain state | Decision |
| --- | --- | --- | --- |
| `activation_pending` | `deal_rooms.state` CHECK | correct | **Keep.** Already the right word. |
| `declined_before_activation` | `deal_rooms.state` CHECK | correct | **Keep.** |
| `cancelled_before_activation` | `deal_rooms.state` CHECK | correct | **Keep.** |
| `room_activation` | `..._charges.kind` CHECK | correct | **Keep.** |
| `reactivation` | `..._charges.kind` CHECK | correct | **Keep.** |
| `additional_branch`, `waiver` | `..._charges.kind` CHECK | correct | **Keep.** |
| `listings.status = 'published'` | `listings.status` CHECK | **correct** | **Keep, deliberately.** Publishing a listing is a real public action and it is free. Renaming it would rename a free act to a paid one in the database, to fix a caption. |
| `listings.status = 'approved'` | `listings.status` CHECK | correct for "cleared the checks" | **Keep the value, change the LABEL.** A member now reads "Checked"; the stored value is unchanged, so no migration, no compatibility handling, and no risk to `live-deals`, `market-activity`, `qualified-opportunity`, `publish.ts` or `interest.ts`, all of which filter on it. |

**Net: zero migrations. Zero renamed identifiers. Zero redirects.** Every
persisted value already described the right domain state, which is why the
correction is entirely a Layer 1 change.

---

## Layer 5 — The public-listing use of "publish"

**Left alone, on instruction and on merit.** A listing genuinely becomes
publicly visible, and that is what publish means. This includes the
`/admin/signals` **Unpublish** control, which takes a Market Signal off the
public board: correct verb, correct object.

The guard in `lib/listings/__tests__/promise-vocabulary.test.ts` is scoped to
the room for exactly this reason. A bare ban on the word would have been the
same category error in the other direction.

---

## What is guarded, and what is not

**Guarded by test** (`promise-vocabulary`, `activation-vocabulary`):
no member-facing human-review promise; no "publish" for a room in copy, email or
any string reaching Stripe; no "active days"; the non-disclosure statement
present and above the payment control; the expiry showing a date, a time and a
zone; the status label reading Checked; the persisted vocabulary NOT swept; and
the copy's period promise asserted against the arithmetic in `periodEndFrom`, so
the words and the code cannot part again.

**Not guarded, because it is outside the repository:**

- **The Supabase-hosted email templates**, which are pasted in by hand through
  the dashboard. See `project_ponte_email_two_surfaces`. A person must check
  these against Layer 1.
- **Stripe dashboard product and price descriptions**, if any exist. Nothing in
  the repository creates a Stripe Product; the credits route uses inline
  `price_data`. A person must confirm the dashboard carries no Deal Room product
  described with "publish".

**Not built, so wording cannot be applied to it yet:**

- The **7, 3 and 1 day expiry warnings** (DECISION-02). `lib/deal-room/moment.ts`
  exists so that when they are built they cannot say "three days remaining" and
  stop there: `expiryLine` returns the count and the instant in one string, and
  there is deliberately no function that returns the count alone.
- **Activation as a paid event**, item 3 of the eleven in ADR-0028. The
  activation screen is a drawing; its controls are inert.
