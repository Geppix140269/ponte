# Ponte outbound email inventory

**Compiled:** 28 July 2026, for ADR-0012.
**Method:** repository-wide search for `sendEmail`, `sendMail`, `Resend`,
`nodemailer`, `emailHtml`, `html:`, `subject:`, `supabase.auth`, `magic link`,
`invite`, `welcome`, `notification`, plus every call site of `lib/email.ts` and
the Supabase configuration recorded in `docs/platform/AUTH-EMAIL-SETUP.md`.

The repository has exactly one mail provider (Resend) and, before this work, one
shared HTML layout private to `lib/email.ts`. The problem was never that
templates were scattered across many shells — it was that the single shell used
colours from no approved token file, had no plain-text part, and that three
templates actively routed members off the platform.

## Application-generated

All render through `lib/email/` and the one shell. All have HTML and plain text.

| Event | Trigger | Recipient | Source | Subject | Status |
|---|---|---|---|---|---|
| `listing_published` | Automated validator publishes a listing | Member | `lib/listings/publish.ts` | Your Ponte offer is now live | **New.** Replaces `sendListingReceived` + the approval half of `sendListingDecision` |
| `listing_needs_information` | Validator finds blocking issues | Member | `lib/listings/publish.ts` | Complete your Ponte offer to publish it | **New** |
| `listing_flagged_internal` | Safety check raises a high/medium flag | Operator | `lib/listings/publish.ts` | Ponte listing PT-XXXX requires review | **New.** Replaces the `sendBrokerageSubmission` desk alert on listings |
| `listing_flagged_member` | Same event, member side | Member | `lib/listings/publish.ts` | Your Ponte offer needs an additional check | **New** |
| `listing_suspended` | Operator pauses a live listing | Member | `lib/email.ts` | Publication paused for PT-XXXX | **New** (send path exists; no console control yet) |
| `listing_rejected` | Operator decides against a listing | Member | `app/[locale]/admin/listings/actions.ts` | Ponte could not publish PT-XXXX | **Migrated** from the rejection half of `sendListingDecision` |
| `listing_expiring` | Declared validity approaching | Member | `lib/email.ts` | Your Ponte listing expires in N days | **New** (send path exists; no scheduler) |
| `welcome` | Account created | Member | `lib/email.ts` | Your Ponte Trade account is ready | **New** (send path exists; not yet wired to signup) |
| `connection_requested` | A member asks to connect | Listing owner | `app/api/marketplace/interest/route.ts` | A member wants to connect on PT-XXXX | **Migrated** from `sendConnectRequest` |
| `connection_accepted` | Both sides accept | Both parties | `app/[locale]/marketplace/actions.ts` | You are connected on PT-XXXX | **Migrated** from `sendConnectAccepted`. Still discloses the counterparty contact — deliberate Block D behaviour, pinned by test 22 |
| `verification_decision` | Desk decides a verification | Member | `app/[locale]/admin/verifications/actions.ts` | Verification confirmed / not confirmed / needs more documents | **Migrated** from `sendVerificationDecision` |
| `operator_alert` | Sanctions refresh, pipeline failures, public deal-desk and network forms, market-signal investigations | Operator | `lib/sanctions/refresh-run.ts`, `app/api/brokerage/submit/route.ts`, `app/api/market-signals/investigate/route.ts` | Varies by caller | **Migrated** from `sendAdminNotice` and `sendBrokerageSubmission` |
| `publication_digest` | Routine publication summary | Operator | `lib/email.ts` | Ponte publication summary — <period> | **New** (send path exists; no scheduler) |

### Retired

| Old function | Why |
|---|---|
| `sendListingReceived` | Said "A person reads every listing before it goes on the board" and "usually within two business days". Both untrue under automated publication |
| `sendListingDecision` | Split into `listing_published` and `listing_rejected`; "Approved and live" implied a human approval that no longer happens |
| `layout()` | Private shell using `#0F1E3C` and `#E8A020` — an email-only navy and amber in no approved token file, and the Constitution states there is no amber |

### Copy removed

- `lib/email.ts:119` — "Reply to this email to answer {name} directly."
- `lib/email.ts:211` — "Just reply to this email: success fee or retainer…"
- `lib/email.ts:336` — "Reply to this email and we scope it with you."
- `app/api/marketplace/submit/route.ts:308` — "review in /admin/listings"
- The tagline "The verified network for cross-border trade", which no authority
  carries. Replaced by the canonical "Cross-border trade, with greater clarity."

### Identity mapping corrected

`app/api/marketplace/submit/route.ts:302-303` passed `name: memberEmail` and
`company: \`Marketplace listing ${ref}\``, producing an operator alert showing an
email address as a person's name and a listing reference as a company. Both are
now separate typed fields on `MemberIdentity`, and a listing reference has its
own row. Regression-tested.

## Provider-side (Supabase Auth)

**Not migrated.** These render from the Supabase dashboard and cannot be
committed. Exact content to paste is in
`docs/email-provider-template-configuration.md`. Until applied they remain
Supabase defaults.

| Template | Supabase name | Status |
|---|---|---|
| Sign-up confirmation | Confirm signup | Documented, not applied |
| Magic link | Magic Link | Documented, not applied |
| Password recovery | Reset Password | Documented, not applied |
| Email address change | Change Email Address | Documented, not applied |
| Invitation | Invite user | Documented, not applied |

Supabase sends no plain-text part and cannot set Reply-To, so the "every email
has a text alternative" rule cannot be met for these five. That is a provider
limitation, recorded rather than worked around.

## Send paths that are not email

Listed so a future search does not mistake them for missed templates:

- `scripts/sanctions-refresh.ts` — calls `sendAdminNotice`, already covered.
- Telegram operations alerts (`docs/TELEGRAM-OPS-SETUP.md`) — a separate
  channel, out of scope for ADR-0012.
